import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { db, customers, ledgerEntries, settings } from "@/lib/db";
import { deleteLedgerEntry } from "@/lib/actions/khata";
import { fmtDate, inr, khataWaText, waLink } from "@/lib/utils";
import { Badge, Card, DeleteBtn, EmptyState, PrintBtn } from "@/components/ui";
import { KhataEntryButtons } from "./entry-form";

export const dynamic = "force-dynamic";

export default async function KhataDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const custId = Number(id);
  if (!Number.isFinite(custId)) notFound();

  const [cust] = await db().select().from(customers).where(eq(customers.id, custId));
  if (!cust) notFound();
  const [shop] = await db().select().from(settings).limit(1);

  const entries = await db().select().from(ledgerEntries)
    .where(eq(ledgerEntries.customerId, custId))
    .orderBy(asc(ledgerEntries.date), asc(ledgerEntries.id));

  let running = 0;
  const withBalance = entries.map((e) => {
    running += e.type === "debit" ? e.amount : -e.amount;
    return { ...e, running };
  });
  const balance = running;
  const totalDebit = entries.filter((e) => e.type === "debit").reduce((s, e) => s + e.amount, 0);
  const totalCredit = entries.filter((e) => e.type === "credit").reduce((s, e) => s + e.amount, 0);
  const overLimit = (cust.creditLimit ?? 0) > 0 && balance > (cust.creditLimit ?? 0);

  const waHref = cust.phone && balance > 0
    ? waLink(cust.phone, khataWaText({
        shopName: shop?.shopName ?? "Shivaa Jewellers",
        customerName: cust.name, balance,
      }))
    : null;

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href="/khata" className="inline-flex items-center gap-1.5 text-xs font-bold text-mut hover:text-ink">
          <ArrowLeft size={15} /> Khata
        </Link>
        <div className="flex-1" />
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors">
            <MessageCircle size={14} /> Send Reminder
          </a>
        )}
        <KhataEntryButtons customerId={cust.id} />
        <PrintBtn />
      </div>

      <div className="print-area print-plain space-y-4">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-lg font-extrabold">{cust.name}</div>
              <div className="text-xs text-mut">
                {[cust.phone, cust.city].filter(Boolean).join(" · ") || "—"}
              </div>
              {(cust.creditLimit ?? 0) > 0 && (
                <div className="text-[11px] mt-1">
                  <span className="text-mut">Credit limit ₹{inr(cust.creditLimit ?? 0)}</span>
                  {overLimit && <Badge tone="red">Over limit</Badge>}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-mut">Balance</div>
              <div className={`text-2xl font-extrabold tabular-nums ${balance > 0 ? "text-red-400" : balance < 0 ? "text-sky" : "text-emerald-400"}`}>
                ₹{inr(Math.abs(balance))}
              </div>
              <div className="text-[10px] text-mut">{balance > 0 ? "due from customer" : balance < 0 ? "advance held" : "settled"}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-edge pt-3 text-xs">
            <div><span className="text-mut">Total billed / udhaar</span><div className="font-bold tabular-nums">₹{inr(totalDebit)}</div></div>
            <div><span className="text-mut">Total received</span><div className="font-bold tabular-nums text-emerald-400">₹{inr(totalCredit)}</div></div>
          </div>
        </Card>

        <Card title="Ledger">
          {withBalance.length === 0 ? (
            <EmptyState title="No entries" desc="Invoices and payments appear here automatically." />
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-mut border-b border-edge">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Particulars</th>
                    <th className="py-2 pr-3 text-right">Debit</th>
                    <th className="py-2 pr-3 text-right">Credit</th>
                    <th className="py-2 pr-3 text-right">Balance</th>
                    <th className="py-2 w-8 no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge/60">
                  {withBalance.map((e) => (
                    <tr key={e.id}>
                      <td className="py-2 pr-3 whitespace-nowrap text-mut text-xs">{fmtDate(e.date)}</td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold">
                          {e.refType === "invoice" ? "Invoice" : e.refType === "payment" ? `Payment${e.mode ? ` (${e.mode})` : ""}` : e.type === "credit" ? `Payment${e.mode ? ` (${e.mode})` : ""}` : "Udhaar"}
                        </div>
                        {e.note && <div className="text-[11px] text-mut">{e.note}</div>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e.type === "debit" ? `₹${inr(e.amount, 2)}` : "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{e.type === "credit" ? `₹${inr(e.amount, 2)}` : "—"}</td>
                      <td className={`py-2 pr-3 text-right tabular-nums font-bold ${e.running > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        ₹{inr(Math.abs(e.running), 2)}{e.running < 0 ? " Cr" : ""}
                      </td>
                      <td className="py-2 no-print">
                        {e.refType === "manual" && (
                          <DeleteBtn action={deleteLedgerEntry.bind(null, e.id, custId)} label="entry" small />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-[11px] text-mut no-print">
            Invoice and invoice-payment rows are linked to bills and can only be removed by deleting the invoice.
          </p>
        </Card>
      </div>
    </div>
  );
}
