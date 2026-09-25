import Link from "next/link";
import { asc, eq, like, sql } from "drizzle-orm";
import { BookUser, ChevronRight } from "lucide-react";
import { db, customers, ledgerEntries } from "@/lib/db";
import { inr } from "@/lib/utils";
import { Card, EmptyState, PageHeader, SearchBox, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function KhataPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;

  const rows = await db()
    .select({
      id: customers.id,
      name: customers.name,
      phone: customers.phone,
      creditLimit: customers.creditLimit,
      balance: sql<number>`coalesce(sum(case when ${ledgerEntries.type} = 'debit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
      entries: sql<number>`count(${ledgerEntries.id})`,
    })
    .from(customers)
    .leftJoin(ledgerEntries, eq(ledgerEntries.customerId, customers.id))
    .where(q ? like(customers.name, `%${q}%`) : undefined)
    .groupBy(customers.id, customers.name, customers.phone, customers.creditLimit)
    .orderBy(asc(customers.name));

  const outstanding = rows.reduce((s, r) => s + Math.max(0, Number(r.balance)), 0);
  const advance = rows.reduce((s, r) => s + Math.max(0, -Number(r.balance)), 0);
  const withDues = rows.filter((r) => Number(r.balance) > 0).length;

  return (
    <div className="space-y-4">
      <PageHeader title="Khata / Udhaar" sub="Customer credit ledger" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={<BookUser size={18} />} label="Total Outstanding" value={`₹${inr(outstanding)}`}
          sub={`${withDues} customer${withDues === 1 ? "" : "s"} with dues`} tone={outstanding > 0 ? "red" : "green"} />
        <StatCard icon={<BookUser size={18} />} label="Advance Held" value={`₹${inr(advance)}`} sub="Paid in excess" tone="sky" />
        <StatCard icon={<BookUser size={18} />} label="Customers" value={String(rows.length)} sub="In khata book" />
      </div>

      <SearchBox placeholder="Search customer…" defaultValue={q} />

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No customers" desc="Add customers under Parties — invoices post to their khata automatically." />
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {rows.map((r) => {
              const bal = Number(r.balance);
              const overLimit = (r.creditLimit ?? 0) > 0 && bal > (r.creditLimit ?? 0);
              return (
                <Link key={r.id} href={`/khata/${r.id}`}
                  className="flex items-center gap-3 px-1 py-3 hover:bg-white/[0.03] rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{r.name}</div>
                    <div className="text-[11px] text-mut">
                      {[r.phone, `${r.entries} entr${Number(r.entries) === 1 ? "y" : "ies"}`].filter(Boolean).join(" · ")}
                      {overLimit ? <span className="text-red-400 font-bold"> · over credit limit</span> : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-extrabold tabular-nums ${bal > 0 ? "text-red-400" : bal < 0 ? "text-sky" : "text-emerald-400"}`}>
                      {bal < 0 ? `₹${inr(-bal)} adv` : `₹${inr(bal)}`}
                    </div>
                    <div className="text-[10px] text-mut">{bal > 0 ? "due" : bal < 0 ? "advance" : "settled"}</div>
                  </div>
                  <ChevronRight size={16} className="text-mut shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
