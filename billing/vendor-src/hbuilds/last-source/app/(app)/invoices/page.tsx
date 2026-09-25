import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, invoices } from "@/lib/db";
import { fmtDate, inr, statusTone } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, SearchBox } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; status?: string }> }) {
  const { q = "", type = "", status = "" } = await searchParams;

  const conds: SQL[] = [];
  if (q) conds.push(or(ilike(invoices.customerName, `%${q}%`), ilike(invoices.invNo, `%${q}%`))!);
  if (type) conds.push(eq(invoices.type, type));
  if (status) conds.push(eq(invoices.status, status));

  const rows = await db().select().from(invoices)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(invoices.id)).limit(300);

  const [agg] = await db().select({
    total: sql<number>`coalesce(sum(${invoices.grandTotal}), 0)`,
    due: sql<number>`coalesce(sum(${invoices.balanceDue}), 0)`,
  }).from(invoices).where(conds.length ? and(...conds) : undefined);

  const filterLink = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}), ...(status ? { status } : {}), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/invoices?${p}`;
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Billing" sub={`₹${inr(Number(agg.total))} billed · ₹${inr(Number(agg.due))} due`}
        actions={
          <div className="flex gap-2">
            <Link href="/invoices/new?type=Estimate"
              className="inline-flex items-center gap-1.5 rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-[13px] font-bold text-slate-200 hover:border-sky/60 hover:text-sky transition-colors">
              <Plus size={15} /> Estimate
            </Link>
            <Link href="/invoices/new?type=GST"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-3.5 py-2.5 text-[13px] font-extrabold text-vault hover:brightness-110 transition-all">
              <Plus size={15} /> GST Invoice
            </Link>
          </div>
        } />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Search customer or invoice no…" defaultValue={q}
          extra={{ ...(type ? { type } : {}), ...(status ? { status } : {}) }} />
        <div className="flex gap-1.5">
          {["", "GST", "Estimate"].map((t) => (
            <a key={t || "all"} href={filterLink({ type: t })}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${type === t ? "border-gold text-gold bg-gold/10" : "border-edge text-mut hover:text-ink"}`}>
              {t || "All types"}
            </a>
          ))}
        </div>
        <div className="flex gap-1.5">
          {["", "Paid", "Partial", "Unpaid"].map((st) => (
            <a key={st || "all"} href={filterLink({ status: st })}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold border transition-colors ${status === st ? "border-sky text-sky bg-sky/10" : "border-edge text-mut hover:text-ink"}`}>
              {st || "All status"}
            </a>
          ))}
        </div>
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No invoices" desc="Create a GST invoice or estimate to get started." />
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {rows.map((iv) => (
              <Link key={iv.id} href={`/invoices/${iv.id}`}
                className="flex items-center gap-3 px-1 py-3 hover:bg-white/[0.03] rounded-lg transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{iv.customerName || "Walk-in"}</div>
                  <div className="text-[11px] text-mut">{iv.invNo} · {fmtDate(iv.date)} · <span className={iv.type === "GST" ? "text-gold" : "text-sky"}>{iv.type}</span></div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-extrabold text-gold tabular-nums">₹{inr(iv.grandTotal ?? 0)}</div>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    {(iv.balanceDue ?? 0) > 0 && <span className="text-[10px] font-bold text-red-400 tabular-nums">₹{inr(iv.balanceDue ?? 0)} due</span>}
                    <Badge tone={statusTone(iv.status)}>{iv.status}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
