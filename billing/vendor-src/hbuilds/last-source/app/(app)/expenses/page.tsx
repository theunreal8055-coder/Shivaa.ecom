import { and, desc, gte, lte, sql } from "drizzle-orm";
import { db, expenses } from "@/lib/db";
import { deleteExpense } from "@/lib/actions/expenses";
import { fmtDate, inr } from "@/lib/utils";
import { Card, DeleteBtn, EmptyState, PageHeader } from "@/components/ui";
import { AddExpenseButton, EditExpenseButton } from "./expense-form";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const month = sp.month || new Date().toISOString().slice(0, 7);
  const start = `${month}-01`;
  const end = `${month}-31`;

  const rows = await db().select().from(expenses)
    .where(and(gte(expenses.date, start), lte(expenses.date, end)))
    .orderBy(desc(expenses.date), desc(expenses.id));

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);
  const byCat = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.category ?? "General";
    acc[k] = (acc[k] ?? 0) + (r.amount ?? 0);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <PageHeader title="Expenses" sub={`₹${inr(total)} in ${new Date(start).toLocaleString("en-IN", { month: "long", year: "numeric" })}`}
        actions={<AddExpenseButton />} />

      <form className="flex items-center gap-2">
        <input type="month" name="month" defaultValue={month}
          className="rounded-xl border border-edge bg-vault px-3.5 py-2.5 text-sm font-semibold text-ink outline-none focus:border-gold" />
        <button className="rounded-xl border border-edge bg-panel px-3.5 py-2.5 text-xs font-bold text-slate-200 hover:border-gold/50">Show</button>
      </form>

      {Object.keys(byCat).length > 0 && (
        <Card title="By Category">
          <div className="flex flex-wrap gap-2">
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="rounded-xl border border-edge bg-panel2 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-mut">{cat}</div>
                <div className="text-sm font-extrabold text-gold tabular-nums">₹{inr(amt)}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No expenses this month" desc="Record shop expenses to track profitability." />
        ) : (
          <div className="divide-y divide-edge/60 -mx-1">
            {rows.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-1 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold truncate">{e.description || e.category}</div>
                  <div className="text-[11px] text-mut">{fmtDate(e.date)} · {e.category} · {e.paymentMode}</div>
                </div>
                <div className="text-sm font-extrabold text-gold tabular-nums shrink-0">₹{inr(e.amount ?? 0)}</div>
                <EditExpenseButton expense={e} />
                <DeleteBtn action={deleteExpense.bind(null, e.id)} label="expense" small />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
