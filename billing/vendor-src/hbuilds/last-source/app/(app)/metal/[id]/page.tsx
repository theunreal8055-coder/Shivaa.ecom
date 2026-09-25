import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db, metalInvoices, settings } from "@/lib/db";
import { deleteMetalBill } from "@/lib/actions/metal";
import { fmtDate, gm } from "@/lib/utils";
import { DeleteBtn, PrintBtn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MetalBillDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const billId = Number(id);
  if (!Number.isFinite(billId)) notFound();

  const [bill] = await db().select().from(metalInvoices).where(eq(metalInvoices.id, billId));
  if (!bill) notFound();
  const [shop] = await db().select().from(settings).limit(1);

  const outRows = bill.outProducts ?? [];
  const inRows = bill.inMetals ?? [];

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-2">
        <Link href="/metal" className="inline-flex items-center gap-1.5 text-xs font-bold text-mut hover:text-ink">
          <ArrowLeft size={15} /> Metal Billing
        </Link>
        <div className="flex-1" />
        <PrintBtn />
        <DeleteBtn action={deleteMetalBill.bind(null, bill.id)} label={`bill ${bill.billNo}`} small />
      </div>

      <div className="print-area mx-auto w-full max-w-[820px] rounded-2xl bg-white text-slate-900 shadow-2xl p-6 sm:p-10 print:shadow-none print:rounded-none print:p-0">
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <div className="font-script text-4xl leading-none text-amber-600">{shop?.shopName ?? "Shivaa Jewellers"}</div>
            <div className="text-[11px] text-slate-600 mt-1.5 whitespace-pre-line">{shop?.address}</div>
            {shop?.phone && <div className="text-[11px] text-slate-600">Ph: {shop.phone}</div>}
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold tracking-wide">METAL BILL</div>
            <div className="text-xs font-bold text-slate-600 mt-1">{bill.billNo}</div>
            <div className="text-xs text-slate-600">Date: {fmtDate(bill.date)}</div>
          </div>
        </div>

        <div className="py-3 border-b border-slate-300 text-xs">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Party</div>
          <div className="font-extrabold text-sm mt-0.5">{bill.partyName}</div>
          <div className="text-slate-500 capitalize">{bill.partyType}</div>
        </div>

        {outRows.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Metal Out (given)</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-left text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-1.5 pr-2">Item</th>
                  <th className="py-1.5 pr-2">Metal / Purity</th>
                  <th className="py-1.5 pr-2 text-right">Net Wt</th>
                  <th className="py-1.5 pr-2 text-right">Wastage</th>
                  <th className="py-1.5 text-right">Fine Wt</th>
                </tr>
              </thead>
              <tbody>
                {outRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-1.5 pr-2 font-bold">{r.name}</td>
                    <td className="py-1.5 pr-2">{r.metal} {r.purity}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{gm(r.netWt)}g</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{r.wastage}%</td>
                    <td className="py-1.5 text-right tabular-nums font-bold">{gm(r.fineWt)}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {inRows.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Metal In (received)</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-900 text-left text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-1.5 pr-2">Description</th>
                  <th className="py-1.5 pr-2">Metal</th>
                  <th className="py-1.5 pr-2 text-right">Gross Wt</th>
                  <th className="py-1.5 pr-2 text-right">Tunch</th>
                  <th className="py-1.5 text-right">Fine Wt</th>
                </tr>
              </thead>
              <tbody>
                {inRows.map((r, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-1.5 pr-2 font-bold">{r.name}</td>
                    <td className="py-1.5 pr-2">{r.metalType}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{gm(r.gross)}g</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{r.tunch}%</td>
                    <td className="py-1.5 text-right tabular-nums font-bold">{gm(r.fineWt)}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <div className="w-full sm:w-72 text-xs space-y-3">
            {(["Gold", "Silver"] as const).map((m) => {
              const out = m === "Gold" ? (bill.fineOutGold ?? 0) : (bill.fineOutSilver ?? 0);
              const inn = m === "Gold" ? (bill.fineInGold ?? 0) : (bill.fineInSilver ?? 0);
              const bal = m === "Gold" ? (bill.balanceGold ?? 0) : (bill.balanceSilver ?? 0);
              if (!out && !inn) return null;
              return (
                <div key={m}>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{m}</div>
                  <div className="flex justify-between tabular-nums"><span className="text-slate-600">Fine out</span><b>{gm(out)}g</b></div>
                  <div className="flex justify-between tabular-nums"><span className="text-slate-600">Fine in</span><b>{gm(inn)}g</b></div>
                  <div className={`flex justify-between border-t-2 border-slate-900 pt-1 font-extrabold tabular-nums ${bal > 0 ? "text-red-600" : "text-emerald-700"}`}>
                    <span>Balance</span><span>{gm(bal)}g</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {bill.notes && <div className="mt-4 text-xs text-slate-600 whitespace-pre-line"><b>Note:</b> {bill.notes}</div>}

        <div className="flex justify-between items-end mt-10 pt-4 text-[10px] text-slate-500">
          <div className="border-t border-slate-400 pt-1 w-40">Party signature</div>
          <div className="border-t border-slate-400 pt-1 w-40 text-right">For {shop?.shopName ?? "Shivaa Jewellers"}</div>
        </div>
      </div>
    </div>
  );
}
