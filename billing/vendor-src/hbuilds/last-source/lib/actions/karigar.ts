"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, karigarJobs, artisans } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { num, str, today } from "@/lib/utils";
import { logAudit, type ActionState } from "./helpers";

export async function saveJob(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  const id = num(fd.get("id"));
  const artisanId = num(fd.get("artisanId")) || null;
  let artisanName = str(fd.get("artisanName"));
  if (artisanId) {
    const [a] = await db().select().from(artisans).where(eq(artisans.id, artisanId));
    if (a) artisanName = a.name;
  }
  if (!artisanName) return { ok: false, message: "Select a karigar for this job." };

  const values = {
    artisanId,
    artisanName,
    metal: str(fd.get("metal")) || "Gold",
    category: str(fd.get("category")) || "Rings",
    purity: str(fd.get("purity")) || "22K (916)",
    issueDate: str(fd.get("issueDate")) || today(),
    durationDays: Math.round(num(fd.get("durationDays"))) || 15,
    labourCharges: num(fd.get("labourCharges")),
    issuedWt: num(fd.get("issuedWt")),
    lessWt: num(fd.get("lessWt")),
    wastagePct: num(fd.get("wastagePct")),
    receivedWt: num(fd.get("receivedWt")),
    status: str(fd.get("status")) || "Pending",
    notes: str(fd.get("notes")),
  };

  if (id) {
    await db().update(karigarJobs).set(values).where(eq(karigarJobs.id, id));
    await logAudit("Karigar job updated", "karigar_job", id, `${artisanName} • ${values.status}`);
  } else {
    const [row] = await db().insert(karigarJobs).values(values);
    await logAudit("Karigar job issued", "karigar_job", row.insertId, `${artisanName} • ${values.issuedWt}g ${values.metal}`);
  }
  revalidatePath("/karigar");
  return { ok: true, message: id ? "Job updated." : "Job issued to karigar." };
}

export async function deleteJob(id: number) {
  await requireSession();
  await db().delete(karigarJobs).where(eq(karigarJobs.id, id));
  await logAudit("Karigar job deleted", "karigar_job", id);
  revalidatePath("/karigar");
}
