"use server";

import { count, eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  db, invoices, inventoryItems, ledgerEntries, customers, settings,
  type InvoiceItem, type OldMetalRow, type PaymentRow,
} from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { computeInvoiceTotals, num, str, today } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export type InvoicePayload = {
  type: "GST" | "Estimate";
  customerId: number | null;
  date: string;
  placeOfSupply: string;
  creditDays: number;
  notes: string;
  discountType: string;
  discountValue: number;
  roundOff: number;
  items: InvoiceItem[];
  oldMetals: OldMetalRow[];
  payments: PaymentRow[];
};

export async function createInvoice(payload: InvoicePayload): Promise<{ ok: false; message: string } | never> {
  await requireSession();

  if (!payload.items.length) return { ok: false, message: "Add at least one product to the bill." };
  if (!payload.customerId) return { ok: false, message: "Select a customer first." };

  const [shop] = await db().select().from(settings).where(eq(settings.id, 1));
  const [cust] = await db().select().from(customers).where(eq(customers.id, payload.customerId));
  if (!cust) return { ok: false, message: "Customer not found." };

  const t = computeInvoiceTotals({
    itemTotals: payload.items.map((i) => i.totalCost),
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    gstPercent: shop?.gstPercent || 3,
    applyGst: payload.type === "GST",
    oldMetalTotals: payload.oldMetals.map((m) => m.totalCost),
    roundOff: payload.roundOff,
    payments: payload.payments.map((p) => p.amount),
  });

  const prefix = payload.type === "GST" ? (shop?.invoicePrefix || "SHV") : "EST";
  const [{ value: existing }] = await db().select({ value: count() }).from(invoices).where(eq(invoices.type, payload.type));
  const invNo = `${prefix}-${String(existing + 1).padStart(4, "0")}`;

  const status = t.balanceDue <= 0 ? "Paid" : t.amountPaid > 0 ? "Partial" : "Unpaid";

  const [inv] = await db().insert(invoices).values({
    invNo,
    type: payload.type,
    customerId: cust.id,
    customerName: cust.name,
    customerPhone: cust.phone || "",
    date: payload.date || today(),
    placeOfSupply: str(payload.placeOfSupply),
    items: payload.items,
    oldMetals: payload.oldMetals,
    payments: payload.payments,
    subtotal: t.subtotal,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    discountAmount: t.discountAmount,
    taxable: t.taxable,
    gstAmount: t.gstAmount,
    oldMetalDeduction: t.oldMetalDeduction,
    roundOff: payload.roundOff,
    grandTotal: t.grandTotal,
    amountPaid: t.amountPaid,
    balanceDue: t.balanceDue,
    creditDays: Math.round(num(String(payload.creditDays))),
    status,
    notes: str(payload.notes),
  }).returning();

  const stockIds = payload.items.map((i) => i.inventoryId).filter((x): x is number => !!x);
  if (stockIds.length) {
    await db().update(inventoryItems).set({ status: "Sold" }).where(inArray(inventoryItems.id, stockIds));
  }

  // Khata: bill amount goes up as debit; every payment received is a credit.
  await db().insert(ledgerEntries).values({
    customerId: cust.id, date: inv.date, type: "debit", amount: t.grandTotal,
    refType: "invoice", refId: inv.id, note: `${payload.type} ${invNo}`,
  });
  for (const p of payload.payments) {
    if (p.amount > 0) {
      await db().insert(ledgerEntries).values({
        customerId: cust.id, date: inv.date, type: "credit", amount: p.amount,
        mode: p.mode, refType: "payment", refId: inv.id, note: `Payment against ${invNo}`,
      });
    }
  }

  await logAudit(`${payload.type} created`, "invoice", inv.id, `${invNo} • ${cust.name} • ₹${t.grandTotal}`);
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  revalidatePath("/khata");
  revalidatePath("/");
  redirect(`/invoices/${inv.id}`);
}

export async function recordInvoicePayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const invoiceId = num(fd.get("invoiceId"));
  const amount = num(fd.get("amount"));
  const mode = str(fd.get("mode")) || "Cash";
  const date = str(fd.get("date")) || today();
  if (amount <= 0) return { ok: false, message: "Enter an amount greater than zero." };

  const [inv] = await db().select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!inv) return { ok: false, message: "Invoice not found." };

  const payments = [...(inv.payments || []), { amount, mode }];
  const amountPaid = (inv.amountPaid || 0) + amount;
  const balanceDue = Math.max(0, (inv.grandTotal || 0) - amountPaid);
  const status = balanceDue <= 0 ? "Paid" : "Partial";

  await db().update(invoices).set({ payments, amountPaid, balanceDue, status }).where(eq(invoices.id, invoiceId));

  if (inv.customerId) {
    await db().insert(ledgerEntries).values({
      customerId: inv.customerId, date, type: "credit", amount, mode,
      refType: "payment", refId: inv.id, note: `Payment against ${inv.invNo}`,
    });
  }
  await logAudit("Payment received", "invoice", inv.id, `${inv.invNo} • ₹${amount} ${mode}`);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/khata");
  revalidatePath("/");
  return { ok: true, message: `Payment of ₹${amount.toLocaleString("en-IN")} recorded.` };
}

export async function deleteInvoice(id: number) {
  await requireSession();
  const [inv] = await db().select().from(invoices).where(eq(invoices.id, id));
  if (!inv) return;

  const stockIds = (inv.items || []).map((i) => i.inventoryId).filter((x): x is number => !!x);
  if (stockIds.length) {
    await db().update(inventoryItems).set({ status: "In Stock" }).where(inArray(inventoryItems.id, stockIds));
  }
  await db().delete(ledgerEntries).where(and(
    eq(ledgerEntries.refId, id),
    inArray(ledgerEntries.refType, ["invoice", "payment"]),
  ));
  await db().delete(invoices).where(eq(invoices.id, id));
  await logAudit("Invoice deleted", "invoice", id, inv.invNo);
  revalidatePath("/invoices");
  revalidatePath("/inventory");
  revalidatePath("/khata");
  redirect("/invoices");
}
