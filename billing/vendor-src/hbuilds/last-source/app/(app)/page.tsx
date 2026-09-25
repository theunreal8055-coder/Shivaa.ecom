import Link from "next/link";
import { desc, eq, gte, sql } from "drizzle-orm";
import {
  Gem, ReceiptText, BookUser, Scale, Wallet, TrendingUp, PackagePlus, UserPlus,
} from "lucide-react";
import { db, settings, inventoryItems, invoices, expenses, ledgerEntries } from "@/lib/db";
import { inr, gm, fmtDate, statusTone } from "@/lib/utils";
import { Card, StatCard, Badge, EmptyState, PageHeader } from "@/components/ui";
import { RatesForm } from "@/components/rates-form";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const monthStart = new Date().toISOString().slice(0, 8) + "01";

  const [s] = await db().select().from(settings).limit(1);
  const goldRate = s?.goldRate ?? 7500;
  const silverRate = s?.silverRate ?? 90;

  const [stockAgg] = await db()
    .select({
      goldWt: sql<number>`coalesce(sum(case when ${inventoryItems.metal} = 'Gold' then ${inventoryItems.netWt} else 0 end), 0)`,
      silverWt: sql<number>`coalesce(sum(case when ${inventoryItems.metal} = 'Silver' then ${inventoryItems.netWt} else 0 end), 0)`,
      pieces: sql<number>`coalesce(sum(${inventoryItems.pieces}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(inventoryItems)
    .where(eq(inventoryItems.status, "In Stock"));

  const [dues] = await db()
    .select({
      outstanding: sql<number>`coalesce(sum(case when ${ledgerEntries.type} = 'debit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
    })
    .from(ledgerEntries);

  const [sales] = await db()
    .select({ total: sql<number>`coalesce(sum(${invoices.grandTotal}), 0)`, count: sql<number>`count(*)` })
    .from(invoices)
    .where(gte(invoices.date, monthStart));

  const [exp] = await db()
    .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)`, count: sql<number>`count(*)` })
    .from(expenses)
    .where(gte(expenses.date, monthStart));

  const recent = await db().select().from(invoices).orderBy(desc(invoices.id)).limit(5);

  const valuation = Number(stockAgg.goldWt) * goldRate + Number(stockAgg.silverWt) * silverRate;
  const outstanding = Math.max(0, Number(dues.outstanding));

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" sub="Business at a glance" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Gem size={18} />} label="Stock Valuation" value={`₹${inr(valuation)}`}
          sub={`${gm(Number(stockAgg.goldWt))}g Au · ${gm(Number(stockAgg.silverWt))}g Ag`} />
        <StatCard icon={<TrendingUp size={18} />} label="Sales This Month" value={`₹${inr(Number(sales.total))}`}
          sub={`${sales.count} invoice${Number(sales.count) === 1 ? "" : "s"}`} tone="sky" />
        <StatCard icon={<BookUser size={18} />} label="Udhaar Outstanding" value={`₹${inr(outstanding)}`}
          sub="Across all customers" tone={outstanding > 0 ? "red" : "green"} />
        <StatCard icon={<Wallet size={18} />} label="Expenses This Month" value={`₹${inr(Number(exp.total))}`}
          sub={`${exp.count} entr${Number(exp.count) === 1 ? "y" : "ies"}`} tone="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Live Metal Rates">
          <RatesForm goldRate={goldRate} silverRate={silverRate} />
          <p className="mt-3 text-[11px] text-mut">
            Rates drive stock valuation and are pre-filled on new invoice rows.
            {s?.ratesUpdatedAt ? ` Last updated ${new Date(s.ratesUpdatedAt).toLocaleString("en-IN")}.` : ""}
          </p>
        </Card>

        <Card title="Quick Actions">
          <div className="grid grid-cols-2 gap-2.5">
            <QuickLink href="/invoices/new?type=GST" icon={<ReceiptText size={17} />} label="New GST Invoice" />
            <QuickLink href="/invoices/new?type=Estimate" icon={<ReceiptText size={17} />} label="New Estimate" />
            <QuickLink href="/inventory?add=1" icon={<PackagePlus size={17} />} label="Add Stock Item" />
            <QuickLink href="/metal/new" icon={<Scale size={17} />} label="Metal Bill" />
            <QuickLink href="/parties?tab=customers&add=1" icon={<UserPlus size={17} />} label="Add Customer" />
            <QuickLink href="/khata" icon={<BookUser size={17} />} label="Open Khata" />
          </div>
        </Card>
      </div>

      <Card title="Recent Invoices" actions={<Link href="/invoices" className="text-xs font-bold text-sky hover:underline">View all</Link>}>
        {recent.length === 0 ? (
          <EmptyState title="No invoices yet" desc="Create your first GST invoice or estimate to see it here." />
        ) : (
          <div className="divide-y divide-edge -mx-1">
            {recent.map((iv) => (
              <Link key={iv.id} href={`/invoices/${iv.id}`}
                className="flex items-center gap-3 px-1 py-2.5 hover:bg-white/[0.03] rounded-lg transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{iv.customerName || "Walk-in"}</div>
                  <div className="text-[11px] text-mut">{iv.invNo} · {fmtDate(iv.date)} · {iv.type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-extrabold text-gold">₹{inr(iv.grandTotal ?? 0)}</div>
                  <Badge tone={statusTone(iv.status)}>{iv.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-2.5 rounded-xl border border-edge bg-panel2 px-3 py-3 text-[13px] font-bold text-slate-200 hover:border-gold/50 hover:text-gold transition-colors">
      <span className="text-gold">{icon}</span>{label}
    </Link>
  );
}
