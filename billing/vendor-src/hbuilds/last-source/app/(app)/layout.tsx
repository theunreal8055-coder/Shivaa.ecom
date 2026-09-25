import { requireSession } from "@/lib/auth";
import { db, settings } from "@/lib/db";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

async function getSettings() {
  const rows = await db().select().from(settings).limit(1);
  if (rows.length) return rows[0];
  // MySQL has no RETURNING — insert, then read the row back.
  await db().insert(settings).values({ id: 1 });
  const [created] = await db().select().from(settings).limit(1);
  return created;
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
