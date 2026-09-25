"use server";

import { revalidatePath } from "next/cache";
import { db, ledgerEntries } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str, today } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";
import { eq } from "drizzle-orm";

export async function addLedgerEntry(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const customerId = num(fd.get("customerId"));
  const type = str(fd.get("type")) === "debit" ? "debit" : "credit";
  const amount = num(fd.get("amount"));
  const mode = str(fd.get("mode"));
  const date = str(fd.get("date")) || today();
  const note = str(fd.get("note"));
  if (!customerId) return { ok: false, message: "Customer missing." };
  if (amount <= 0) return { ok: false, message: "Enter an amount greater than zero." };

  await db().insert(ledgerEntries).values({ customerId, type, amount, mode, date, note, refType: "manual" });
  await logAudit(type === "credit" ? "Khata payment received" : "Udhaar added", "khata", customerId, `₹${amount}`);
  revalidatePath(`/khata/${customerId}`);
  revalidatePath("/khata");
  revalidatePath("/");
  return { ok: true, message: type === "credit" ? "Payment recorded." : "Udhaar entry added." };
}

export async function deleteLedgerEntry(id: number, customerId: number) {
  await requireSession();
  await db().delete(ledgerEntries).where(eq(ledgerEntries.id, id));
  await logAudit("Khata entry deleted", "khata", customerId);
  revalidatePath(`/khata/${customerId}`);
  revalidatePath("/khata");
}
