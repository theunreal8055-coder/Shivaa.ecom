import { db, auditLogs } from "@/lib/db";

export async function logAudit(action: string, entity: string, entityId?: number | null, detail?: string) {
  try {
    await db().insert(auditLogs).values({ action, entity, entityId: entityId ?? null, detail: detail || "" });
  } catch { /* audit must never break the main flow */ }
}

export type ActionState = { ok: boolean; message: string };
export const idle: ActionState = { ok: false, message: "" };
