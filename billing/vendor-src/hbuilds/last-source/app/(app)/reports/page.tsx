import { and, eq, gte, lte, sql } from "drizzle-orm";
import { Download, TrendingUp, Receipt, Wallet, BookUser, Gem, Scale } from "lucide-react";
import { db, invoices, expenses, inventoryItems, ledgerEntries, settings, karigarJobs } from "@/lib/db";
import { gm, inr, plural } from "@/lib/utils";
import { Card, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXPORTS = [
  { key: "inventory", label: "Inventory" },
  { key: "invoices", label: "Invoices" },
  { key: "customers", label: "Customers" },
  { key: "suppliers", label: "Suppliers" },
  { key: "khata", label: "Khata Ledger" },
  { key: "expenses", label: "Expenses" },
  { key: "karigar", label: "Karigar Jobs" },
  { key: "metal", label: "Metal Bills" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const from = sp.from || `${now.toISOString().slice(0, 8)}01`;
  const to = sp.to || now.toISOString().slice(0, 10);

  const range = and(gte(invoices.date, from), lte(invoices.date, to));

  const [sales] = await db().select({
    total: sql<number>`coalesce(sum(${invoices.grandTotal}), 0)`,
    gst: sql<number>`coalesce(sum(${invoices.gstAmount}), 0)`,
    due: sql<number>`coalesce(sum(${invoices.balanceDue}), 0)`,
    count: sql<number>`count(*)`,
    oldMetal: sql<number>`coalesce(sum(${invoices.oldMetalDeduction}), 0)`,
  }).from(invoices).where(range);

  const [exp] = await db().select({
    total: sql<number>`coalesce(sum(${expenses.amount}), 0)`,
    count: sql<number>`count(*)`,
  }).from(expenses).where(and(gte(expenses.date, from), lte(expenses.date, to)));

  const [stock] = await db().select({
    goldWt: sql<number>`coalesce(sum(case when ${inventoryItems.metal} = 'Gold' then ${inventoryItems.netWt} else 0 end), 0)`,
    silverWt: sql<number>`coalesce(sum(case when ${inventoryItems.metal} = 'Silver' then ${inventoryItems.netWt} else 0 end), 0)`,
    items: sql<number>`count(*)`,
  }).from(inventoryItems).where(eq(inventoryItems.status, "In Stock"));

  const [dues] = await db().select({
    outstanding: sql<number>`coalesce(sum(case when ${ledgerEntries.type} = 'debit' then ${ledgerEntries.amount} else -${ledgerEntries.amount} end), 0)`,
  }).from(ledgerEntries);

  const [jobs] = await db().select({
    openWt: sql<number>`coalesce(sum(case when ${karigarJobs.status} <> 'Completed' then ${karigarJobs.issuedWt} else 0 end), 0)`,
    open: sql<number>`coalesce(sum(case when ${karigarJobs.status} <> 'Completed' then 1 else 0 end), 0)`,
  }).from(karigarJobs);

  const [s] = await db().select().from(settings).limit(1);
  const valuation = Number(stock.goldWt) * (s?.goldRate ?? 7500) + Number(stock.silverWt) * (s?.silverRate ?? 90);
  const netFlow = Number(sales.total) - Number(exp.total);

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" sub="Business summary & data exports" />

      <Card title="Date Range">
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[10px] font-bold text-mut uppercase tracking-widest mb-1.5">From</label>
            <input type="date" name="from" defaultValue={from}
              className="rounded-xl border border-edge bg-vault px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-gold" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-mut uppercase tracking-widest mb-1.5">To</label>
            <input type="date" name="to" defaultValue={to}
              className="rounded-xl border border-edge bg-vault px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-gold" />
          </div>
          <button className="rounded-xl bg-gold px-4 py-2.5 text-sm font-extrabold text-vault hover:brightness-110">Apply</button>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<TrendingUp size={18} />} label="Sales" value={`₹${inr(Number(sales.total))}`} sub={plural(Number(sales.count), "invoice")} />
        <StatCard icon={<Receipt size={18} />} label="GST Collected" value={`₹${inr(Number(sales.gst))}`} sub="CGST + SGST" tone="sky" />
        <StatCard icon={<Wallet size={18} />} label="Expenses" value={`₹${inr(Number(exp.total))}`} sub={plural(Number(exp.count), "entry", "entries")} tone="amber" />
        <StatCard icon={<TrendingUp size={18} />} label="Sales − Expenses" value={`₹${inr(netFlow)}`} sub="Gross cash flow" tone={netFlow >= 0 ? "green" : "red"} />
        <StatCard icon={<BookUser size={18} />} label="Khata Outstanding" value={`₹${inr(Math.max(0, Number(dues.outstanding)))}`} sub="All customers" tone="red" />
        <StatCard icon={<Receipt size={18} />} label="Invoice Dues" value={`₹${inr(Number(sales.due))}`} sub="Unpaid in range" tone="red" />
        <StatCard icon={<Gem size={18} />} label="Stock Valuation" value={`₹${inr(valuation)}`} sub={plural(Number(stock.items), "item")} />
        <StatCard icon={<Scale size={18} />} label="With Karigars" value={`${gm(Number(jobs.openWt))}g`} sub={`${plural(Number(jobs.open), "open job")}`} tone="sky" />
      </div>

      {Number(sales.oldMetal) > 0 && (
        <Card title="Old Metal Taken In">
          <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">₹{inr(Number(sales.oldMetal))}</div>
          <p className="text-[11px] text-mut mt-1">Value of customers’ old gold/silver exchanged against bills in this range.</p>
        </Card>
      )}

      <Card title="Export Data (CSV)">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {EXPORTS.map((e) => (
            <a key={e.key} href={`/api/export/${e.key}`}
              className="flex items-center gap-2 rounded-xl border border-edge bg-panel2 px-3 py-3 text-[13px] font-bold text-slate-200 hover:border-gold/50 hover:text-gold transition-colors">
              <Download size={15} /> {e.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-mut mt-3">CSV files open directly in Excel or Google Sheets. For a full data backup, use the Secure Vault.</p>
      </Card>
    </div>
  );
}
