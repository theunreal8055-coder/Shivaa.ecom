"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, expenses } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str, today } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export async function saveExpense(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const values = {
    date: str(fd.get("date")) || today(),
    category: str(fd.get("category")) || "General",
    description: str(fd.get("description")),
    amount: num(fd.get("amount")),
    paymentMode: str(fd.get("paymentMode")) || "Cash",
  };
  if (values.amount <= 0) return { ok: false, message: "Enter an amount greater than zero." };

  if (id) {
    await db().update(expenses).set(values).where(eq(expenses.id, id));
    await logAudit("Expense updated", "expense", id, `₹${values.amount} • ${values.category}`);
  } else {
    const [row] = await db().insert(expenses).values(values).returning();
    await logAudit("Expense added", "expense", row.id, `₹${values.amount} • ${values.category}`);
  }
  revalidatePath("/expenses");
  revalidatePath("/");
  return { ok: true, message: "Expense saved." };
}

export async function deleteExpense(id: number) {
  await requireSession();
  await db().delete(expenses).where(eq(expenses.id, id));
  await logAudit("Expense deleted", "expense", id);
  revalidatePath("/expenses");
}
