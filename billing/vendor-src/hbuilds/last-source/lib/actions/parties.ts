"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, customers, suppliers, artisans } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export async function saveCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const values = {
    name: str(fd.get("name")),
    phone: str(fd.get("phone")),
    email: str(fd.get("email")),
    address: str(fd.get("address")),
    city: str(fd.get("city")),
    pan: str(fd.get("pan")).toUpperCase(),
    aadhar: str(fd.get("aadhar")),
    creditLimit: num(fd.get("creditLimit")),
    creditDays: Math.round(num(fd.get("creditDays"))),
    notes: str(fd.get("notes")),
  };
  if (!values.name) return { ok: false, message: "Customer name is required." };
  if (id) {
    await db().update(customers).set(values).where(eq(customers.id, id));
    await logAudit("Customer updated", "customer", id, values.name);
  } else {
    const [row] = await db().insert(customers).values(values).returning();
    await logAudit("Customer added", "customer", row.id, values.name);
  }
  revalidatePath("/parties");
  revalidatePath("/khata");
  return { ok: true, message: "Customer saved." };
}

export async function deleteCustomer(id: number) {
  await requireSession();
  await db().delete(customers).where(eq(customers.id, id));
  await logAudit("Customer deleted", "customer", id);
  revalidatePath("/parties");
  revalidatePath("/khata");
}

export async function saveSupplier(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const values = {
    name: str(fd.get("name")),
    company: str(fd.get("company")),
    phone: str(fd.get("phone")),
    address: str(fd.get("address")),
    city: str(fd.get("city")),
    pan: str(fd.get("pan")).toUpperCase(),
    gstin: str(fd.get("gstin")).toUpperCase(),
    accName: str(fd.get("accName")),
    accNumber: str(fd.get("accNumber")),
    ifsc: str(fd.get("ifsc")).toUpperCase(),
    notes: str(fd.get("notes")),
  };
  if (!values.name) return { ok: false, message: "Supplier name is required." };
  if (id) {
    await db().update(suppliers).set(values).where(eq(suppliers.id, id));
    await logAudit("Supplier updated", "supplier", id, values.name);
  } else {
    const [row] = await db().insert(suppliers).values(values).returning();
    await logAudit("Supplier added", "supplier", row.id, values.name);
  }
  revalidatePath("/parties");
  return { ok: true, message: "Supplier saved." };
}

export async function deleteSupplier(id: number) {
  await requireSession();
  await db().delete(suppliers).where(eq(suppliers.id, id));
  await logAudit("Supplier deleted", "supplier", id);
  revalidatePath("/parties");
}

export async function saveArtisan(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const values = {
    name: str(fd.get("name")),
    phone: str(fd.get("phone")),
    specialization: str(fd.get("specialization")),
    address: str(fd.get("address")),
    notes: str(fd.get("notes")),
  };
  if (!values.name) return { ok: false, message: "Karigar name is required." };
  if (id) {
    await db().update(artisans).set(values).where(eq(artisans.id, id));
    await logAudit("Karigar updated", "artisan", id, values.name);
  } else {
    const [row] = await db().insert(artisans).values(values).returning();
    await logAudit("Karigar added", "artisan", row.id, values.name);
  }
  revalidatePath("/parties");
  revalidatePath("/karigar");
  return { ok: true, message: "Karigar saved." };
}

export async function deleteArtisan(id: number) {
  await requireSession();
  await db().delete(artisans).where(eq(artisans.id, id));
  await logAudit("Karigar deleted", "artisan", id);
  revalidatePath("/parties");
  revalidatePath("/karigar");
}
