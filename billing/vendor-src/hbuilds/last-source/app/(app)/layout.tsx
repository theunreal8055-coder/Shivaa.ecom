import { requireSession } from "@/lib/auth";
import { db, settings } from "@/lib/db";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

async function getSettings() {
  const rows = await db().select().from(settings).limit(1);
  if (rows.length) return rows[0];
  const inserted = await db().insert(settings).values({ id: 1 }).returning();
  return inserted[0];
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const s = await getSettings();
  return (
    <Shell userName={session.name || session.email} goldRate={s.goldRate ?? 7500} silverRate={s.silverRate ?? 90}>
      {children}
    </Shell>
  );
}
