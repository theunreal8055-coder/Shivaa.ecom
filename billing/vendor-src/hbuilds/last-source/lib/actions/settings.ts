"use server";

import { revalidatePath } from "next/cache";
import { db, settings } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";
import { eq } from "drizzle-orm";

export async function updateRates(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const goldRate = num(fd.get("goldRate"));
  const silverRate = num(fd.get("silverRate"));
  if (goldRate <= 0 || silverRate <= 0) return { ok: false, message: "Rates must be greater than zero." };
  await db().update(settings).set({ goldRate, silverRate, ratesUpdatedAt: new Date() }).where(eq(settings.id, 1));
  await logAudit("Rates updated", "settings", 1, `Gold ₹${goldRate}/g, Silver ₹${silverRate}/g`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Live rates updated." };
}

export async function updateShop(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  await db().update(settings).set({
    shopName: str(fd.get("shopName")) || "Shivaa Jewellers",
    tagline: str(fd.get("tagline")),
    address: str(fd.get("address")),
    phone: str(fd.get("phone")),
    gstin: str(fd.get("gstin")),
    invoicePrefix: str(fd.get("invoicePrefix")) || "SHV",
    gstPercent: num(fd.get("gstPercent")) || 3,
  }).where(eq(settings.id, 1));
  await logAudit("Shop profile updated", "settings", 1);
  revalidatePath("/", "layout");
  return { ok: true, message: "Shop details saved." };
}
