import { db, auditLogs } from "@/lib/db";

// Re-exported so existing server-side importers keep working.
// Client components must import from "@/lib/actions/state" instead.
export { idle } from "./state";
export type { ActionState } from "./state";

export async function logAudit(action: string, entity: string, entityId?: number | null, detail?: string) {
  try {
    await db().insert(auditLogs).values({ action, entity, entityId: entityId ?? null, detail: detail || "" });
  } catch { /* audit must never break the main flow */ }
}
