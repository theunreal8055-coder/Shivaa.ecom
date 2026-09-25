import Link from "next/link";
import { desc, ilike } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, metalInvoices } from "@/lib/db";
import { fmtDate, gm } from "@/lib/utils";
import { Card, EmptyState, PageHeader, SearchBox } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MetalPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const rows = await db().select().from(metalInvoices)
    .where(q ? ilike(metalInvoices.partyName, `%${q}%`) : undefined)
    .orderBy(desc(metalInvoices.id)).limit(300);

  return (
    <div className="space-y-4">
      <PageHeader title="Metal Billing" sub="Tunch & wastage based fine-weight bills"
        actions={
          <Link href="/metal/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2.5 text-[13px] font-extrabold text-vault hover:brightness-110 transition-all">
            <Plus size={15} /> New Metal Bill
          </Link>
        } />

      <SearchBox placeholder="Search party…" defaultValue={q} />

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No metal bills" desc="Create a metal bill to track fine weight given and received." />
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {rows.map((b) => (
              <Link key={b.id} href={`/metal/${b.id}`}
                className="flex items-center gap-3 px-1 py-3 hover:bg-white/[0.03] rounded-lg transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{b.partyName || "—"}</div>
                  <div className="text-[11px] text-mut">{b.billNo} · {fmtDate(b.date)} · <span className="capitalize">{b.partyType}</span></div>
                </div>
                <div className="text-right text-[11px] tabular-nums shrink-0">
                  {(b.fineOutGold || b.fineInGold) ? (
                    <div className={((b.balanceGold ?? 0) > 0) ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      Au {gm(b.balanceGold ?? 0)}g
                    </div>
                  ) : null}
                  {(b.fineOutSilver || b.fineInSilver) ? (
                    <div className={((b.balanceSilver ?? 0) > 0) ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                      Ag {gm(b.balanceSilver ?? 0)}g
                    </div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
