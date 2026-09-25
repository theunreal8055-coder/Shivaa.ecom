"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, inventoryItems } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export async function saveItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const grossWt = num(fd.get("grossWt"));
  const lessWt = num(fd.get("lessWt"));
  const values = {
    name: str(fd.get("name")),
    sku: str(fd.get("sku")),
    huid: str(fd.get("huid")).toUpperCase(),
    category: str(fd.get("category")) || "Rings",
    metal: str(fd.get("metal")) || "Gold",
    purity: str(fd.get("purity")) || "22K (916)",
    grossWt,
    lessWt,
    stoneWt: num(fd.get("stoneWt")),
    netWt: Math.max(0, grossWt - lessWt),
    pieces: Math.max(1, Math.round(num(fd.get("pieces")) || 1)),
    stoneDetails: str(fd.get("stoneDetails")),
    status: str(fd.get("status")) || "In Stock",
    notes: str(fd.get("notes")),
  };
  if (!values.name) return { ok: false, message: "Product name is required." };

  if (id) {
    await db().update(inventoryItems).set(values).where(eq(inventoryItems.id, id));
    await logAudit("Item updated", "inventory", id, values.name);
  } else {
    const [row] = await db().insert(inventoryItems).values(values);
    await logAudit("Item added", "inventory", row.insertId, values.name);
  }
  revalidatePath("/inventory");
  return { ok: true, message: id ? "Item updated." : "Item added to vault." };
}

export async function deleteItem(id: number) {
  await requireSession();
  await db().delete(inventoryItems).where(eq(inventoryItems.id, id));
  await logAudit("Item deleted", "inventory", id);
  revalidatePath("/inventory");
}
