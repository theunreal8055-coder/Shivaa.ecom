"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  db, settings, inventoryItems, customers, suppliers, invoices,
  metalInvoices, karigarJobs, expenses,
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { today } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

/* Best-effort field pickers — the old localStorage app used slightly
   different key names in different versions, so read generously. */
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown) => { const x = parseFloat(String(v)); return isNaN(x) ? 0 : x; };
const pick = (o: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  return undefined;
};

export async function importBackup(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const raw = String(fd.get("json") || "");
  if (!raw.trim()) return { ok: false, message: "Choose a backup file first." };

  let data: Record<string, unknown>;
  try { data = JSON.parse(raw); } catch { return { ok: false, message: "That file is not valid JSON. Export the backup again and retry." }; }

  const counts: Record<string, number> = {};
  const arr = (key: string) => (Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : []);

  for (const c of arr("customers")) {
    await db().insert(customers).values({
      name: s(pick(c, "company", "name")) || "Customer",
      phone: s(pick(c, "contact", "phone")),
      address: s(pick(c, "address")),
      city: s(pick(c, "city")),
      pan: s(pick(c, "pan")).toUpperCase(),
      aadhar: s(pick(c, "aadhar")),
      creditLimit: n(pick(c, "creditLimit")),
      creditDays: Math.round(n(pick(c, "creditDays"))),
    });
    counts.customers = (counts.customers || 0) + 1;
  }

  for (const c of arr("suppliers")) {
    await db().insert(suppliers).values({
      name: s(pick(c, "name", "company")) || "Supplier",
      company: s(pick(c, "company")),
      phone: s(pick(c, "contact", "phone")),
      address: s(pick(c, "address")),
      city: s(pick(c, "city")),
      pan: s(pick(c, "pan")).toUpperCase(),
      gstin: s(pick(c, "gst", "gstin")).toUpperCase(),
      accName: s(pick(c, "accName")),
      accNumber: s(pick(c, "accNumber")),
      ifsc: s(pick(c, "ifsc")).toUpperCase(),
    });
    counts.suppliers = (counts.suppliers || 0) + 1;
  }

  for (const i of arr("inventory")) {
    const gross = n(pick(i, "gross", "grossWt", "weight"));
    const less = n(pick(i, "less", "lessWt"));
    const net = n(pick(i, "net", "netWt")) || Math.max(0, gross - less);
    await db().insert(inventoryItems).values({
      name: s(pick(i, "name")) || "Item",
      sku: s(pick(i, "sku")),
      huid: s(pick(i, "huid")).toUpperCase(),
      category: s(pick(i, "category")) || "Rings",
      metal: s(pick(i, "metal")) || "Gold",
      purity: s(pick(i, "purity")) || "22K (916)",
      grossWt: gross || net,
      lessWt: less,
      stoneWt: n(pick(i, "stoneWt")),
      netWt: net,
      pieces: Math.max(1, Math.round(n(pick(i, "pcs", "pieces")) || 1)),
      stoneDetails: s(pick(i, "stone", "quality", "stoneDetails")),
      status: s(pick(i, "status")) || "In Stock",
    });
    counts.inventory = (counts.inventory || 0) + 1;
  }

  for (const inv of arr("invoices")) {
    const total = n(pick(inv, "total", "grandTotal"));
    await db().insert(invoices).values({
      invNo: s(pick(inv, "invNo")) || `IMP-${Date.now()}`,
      type: s(pick(inv, "type")) === "Estimate" ? "Estimate" : "GST",
      customerName: s(pick(inv, "customerName")),
      date: s(pick(inv, "date")) || today(),
      grandTotal: total,
      amountPaid: n(pick(inv, "amountPaid")) || total,
      balanceDue: n(pick(inv, "balanceDue")),
      creditDays: Math.round(n(pick(inv, "creditDays"))),
      status: n(pick(inv, "balanceDue")) > 0 ? "Partial" : "Paid",
      notes: "Imported from old backup",
    });
    counts.invoices = (counts.invoices || 0) + 1;
  }

  for (const m of arr("metalInvoices")) {
    await db().insert(metalInvoices).values({
      billNo: s(pick(m, "billNo")) || `MB-IMP-${Date.now()}`,
      partyName: s(pick(m, "partyName", "customerName")),
      date: s(pick(m, "date")) || today(),
      fineOutGold: n(pick(m, "fineGoldOut", "fineOutGold", "totalFineOut")),
      fineInGold: n(pick(m, "fineGoldIn", "fineInGold", "totalFineIn")),
      balanceGold: n(pick(m, "balanceGold", "balanceFine")),
      notes: "Imported from old backup",
    });
    counts.metalBills = (counts.metalBills || 0) + 1;
  }

  for (const j of arr("jobs")) {
    await db().insert(karigarJobs).values({
      artisanName: s(pick(j, "karigarName", "artisanName")) || "Karigar",
      metal: s(pick(j, "metal")) || "Gold",
      category: s(pick(j, "category")) || "Rings",
      purity: s(pick(j, "purity")) || "22K (916)",
      issueDate: s(pick(j, "issueDate")) || today(),
      durationDays: Math.round(n(pick(j, "durationDays"))) || 15,
      labourCharges: n(pick(j, "labourWork", "labourCharges")),
      issuedWt: n(pick(j, "issuedWt")),
      lessWt: n(pick(j, "lessWt")),
      wastagePct: n(pick(j, "wastage", "wastagePct")),
      status: s(pick(j, "status")) || "Pending",
    });
    counts.karigarJobs = (counts.karigarJobs || 0) + 1;
  }

  for (const e of arr("expenses")) {
    await db().insert(expenses).values({
      date: s(pick(e, "date")) || today(),
      category: s(pick(e, "category")) || "General",
      description: s(pick(e, "description", "desc")),
      amount: n(pick(e, "amount")),
      paymentMode: s(pick(e, "paymentMode", "mode")) || "Cash",
    });
    counts.expenses = (counts.expenses || 0) + 1;
  }

  const rates = data.liveRates as Record<string, unknown> | undefined;
  if (rates && (rates.gold || rates.silver)) {
    await db().update(settings).set({
      goldRate: n(rates.gold) || 7500,
      silverRate: n(rates.silver) || 90,
      ratesUpdatedAt: new Date(),
    }).where(eq(settings.id, 1));
    counts.rates = 1;
  }

  const summary = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing recognisable";
  await logAudit("Backup imported", "vault", null, summary);
  revalidatePath("/", "layout");
  return { ok: true, message: `Imported ${summary}. Review each section to confirm the data.` };
}
