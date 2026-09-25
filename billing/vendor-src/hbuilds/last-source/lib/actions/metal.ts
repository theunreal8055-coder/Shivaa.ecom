"use server";

import { count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, metalInvoices, inventoryItems, type MetalOutRow, type MetalInRow } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { str, today } from "@/lib/utils";
import { logAudit } from "./helpers";

export type MetalBillPayload = {
  partyType: "customer" | "supplier" | "other";
  partyId: number | null;
  partyName: string;
  date: string;
  notes: string;
  outProducts: MetalOutRow[];
  inMetals: MetalInRow[];
};

function fineBy(rows: { metal?: string; metalType?: string; fineWt: number }[], metal: string) {
  return rows
    .filter((r) => (r.metal || r.metalType || "Gold").toLowerCase() === metal)
    .reduce((s, r) => s + (r.fineWt || 0), 0);
}

export async function createMetalBill(payload: MetalBillPayload): Promise<{ ok: false; message: string } | never> {
  await requireSession();
  if (!payload.outProducts.length && !payload.inMetals.length) {
    return { ok: false, message: "Add at least one outgoing product or incoming metal." };
  }
  if (!payload.partyName.trim()) return { ok: false, message: "Select or enter the party name." };

  const fineOutGold = fineBy(payload.outProducts, "gold");
  const fineInGold = fineBy(payload.inMetals, "gold");
  const fineOutSilver = fineBy(payload.outProducts, "silver");
  const fineInSilver = fineBy(payload.inMetals, "silver");

  const [{ value: existing }] = await db().select({ value: count() }).from(metalInvoices);
  const billNo = `MB-${String(existing + 1).padStart(4, "0")}`;

  const [bill] = await db().insert(metalInvoices).values({
    billNo,
    partyType: payload.partyType,
    partyId: payload.partyId,
    partyName: str(payload.partyName),
    date: payload.date || today(),
    outProducts: payload.outProducts,
    inMetals: payload.inMetals,
    fineOutGold, fineInGold, balanceGold: fineOutGold - fineInGold,
    fineOutSilver, fineInSilver, balanceSilver: fineOutSilver - fineInSilver,
    notes: str(payload.notes),
  }).returning();

  const stockIds = payload.outProducts.map((p) => p.inventoryId).filter((x): x is number => !!x);
  if (stockIds.length) {
    await db().update(inventoryItems).set({ status: "Sold" }).where(inArray(inventoryItems.id, stockIds));
  }

  await logAudit("Metal bill created", "metal", bill.id, `${billNo} • ${payload.partyName}`);
  revalidatePath("/metal");
  revalidatePath("/inventory");
  redirect(`/metal/${bill.id}`);
}

export async function deleteMetalBill(id: number) {
  await requireSession();
  const [bill] = await db().select().from(metalInvoices).where(eq(metalInvoices.id, id));
  if (!bill) return;
  const stockIds = (bill.outProducts || []).map((p) => p.inventoryId).filter((x): x is number => !!x);
  if (stockIds.length) {
    await db().update(inventoryItems).set({ status: "In Stock" }).where(inArray(inventoryItems.id, stockIds));
  }
  await db().delete(metalInvoices).where(eq(metalInvoices.id, id));
  await logAudit("Metal bill deleted", "metal", id, bill.billNo);
  revalidatePath("/metal");
  revalidatePath("/inventory");
  redirect("/metal");
}
