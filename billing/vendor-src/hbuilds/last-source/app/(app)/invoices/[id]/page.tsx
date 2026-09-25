import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { db, invoices, settings } from "@/lib/db";
import { deleteInvoice } from "@/lib/actions/invoices";
import { addDays, amountInWords, fmtDate, gm, inr, invoiceWaText, statusTone, waLink } from "@/lib/utils";
import { Badge, DeleteBtn, PrintBtn } from "@/components/ui";
import { PaymentButton } from "./payment-form";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invId = Number(id);
  if (!Number.isFinite(invId)) notFound();

  const [inv] = await db().select().from(invoices).where(eq(invoices.id, invId));
  if (!inv) notFound();
  const [shop] = await db().select().from(settings).limit(1);

  const items = inv.items ?? [];
  const oldMetals = inv.oldMetals ?? [];
  const payments = inv.payments ?? [];
  const isGst = inv.type === "GST";
  const gstPct = shop?.gstPercent ?? 3;
  const dueDate = (inv.creditDays ?? 0) > 0 ? addDays(inv.date, inv.creditDays ?? 0) : null;

  const waHref = inv.customerPhone
    ? waLink(inv.customerPhone, invoiceWaText({
        shopName: shop?.shopName ?? "Shivaa Jewellers",
        invNo: inv.invNo, date: inv.date, customerName: inv.customerName || "Customer",
        grandTotal: inv.grandTotal ?? 0, amountPaid: inv.amountPaid ?? 0, balanceDue: inv.balanceDue ?? 0,
      }))
    : null;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-xs font-bold text-mut hover:text-ink">
          <ArrowLeft size={15} /> Billing
        </Link>
        <div className="flex-1" />
        <Badge tone={statusTone(inv.status)}>{inv.status}</Badge>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-colors">
            <MessageCircle size={14} /> WhatsApp
          </a>
        )}
        <PaymentButton invoiceId={inv.id} balanceDue={inv.balanceDue ?? 0} />
        <PrintBtn />
        <DeleteBtn action={deleteInvoice.bind(null, inv.id)} label={`invoice ${inv.invNo}`} small />
      </div>

      {/* Printable bill */}
      <div className="print-area mx-auto w-full max-w-[820px] rounded-2xl bg-white text-slate-900 shadow-2xl p-6 sm:p-10 print:shadow-none print:rounded-none print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <div className="font-script text-4xl leading-none text-amber-600">{shop?.shopName ?? "Shivaa Jewellers"}</div>
            {shop?.tagline && <div className="text-[11px] font-semibold tracking-wide text-slate-500 mt-1">{shop.tagline}</div>}
            <div className="text-[11px] text-slate-600 mt-1.5 whitespace-pre-line">{shop?.address}</div>
            <div className="text-[11px] text-slate-600">
              {[shop?.phone ? `Ph: ${shop.phone}` : "", isGst && shop?.gstin ? `GSTIN: ${shop.gstin}` : ""].filter(Boolean).join("  ·  ")}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-extrabold tracking-wide">{isGst ? "TAX INVOICE" : "ESTIMATE"}</div>
            <div className="text-xs font-bold text-slate-600 mt-1">{inv.invNo}</div>
            <div className="text-xs text-slate-600">Date: {fmtDate(inv.date)}</div>
            {dueDate && <div className="text-xs text-slate-600">Due: {fmtDate(dueDate)}</div>}
          </div>
        </div>

        {/* Bill to */}
        <div className="flex flex-wrap justify-between gap-4 py-3 border-b border-slate-300 text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Billed to</div>
            <div className="font-extrabold text-sm mt-0.5">{inv.customerName || "Walk-in Customer"}</div>
            {inv.customerPhone && <div className="text-slate-600">Ph: {inv.customerPhone}</div>}
          </div>
          {inv.placeOfSupply && (
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Place of supply</div>
              <div className="font-bold mt-0.5">{inv.placeOfSupply}</div>
            </div>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-xs mt-3">
          <thead>
            <tr className="border-b-2 border-slate-900 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th className="py-1.5 pr-2 w-6">#</th>
              <th className="py-1.5 pr-2">Description</th>
              <th className="py-1.5 pr-2">Purity</th>
              <th className="py-1.5 pr-2 text-right">Net Wt</th>
              <th className="py-1.5 pr-2 text-right">Rate/g</th>
              <th className="py-1.5 pr-2 text-right">Making</th>
              <th className="py-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-200 align-top">
                <td className="py-2 pr-2 text-slate-500">{i + 1}</td>
                <td className="py-2 pr-2">
                  <div className="font-bold">{it.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {[it.huid ? `HUID ${it.huid}` : "", it.pieces > 1 ? `${it.pieces} pcs` : ""].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="py-2 pr-2">{it.metal} {it.purity}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{gm(it.netWt)}g</td>
                <td className="py-2 pr-2 text-right tabular-nums">₹{inr(it.rate, 2)}</td>
                <td className="py-2 pr-2 text-right tabular-nums">₹{inr(it.making, 2)}</td>
                <td className="py-2 text-right tabular-nums font-bold">₹{inr(it.totalCost, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Old metal */}
        {oldMetals.length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Old metal exchange (less)</div>
            <table className="w-full text-xs mt-1">
              <tbody>
                {oldMetals.map((m, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-1.5 pr-2">{m.name} ({m.metalType})</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{gm(m.givenWt)}g @ {m.tunch}%</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">fine {gm(m.netWt)}g × ₹{inr(m.rate, 2)}</td>
                    <td className="py-1.5 text-right tabular-nums font-bold text-emerald-700">− ₹{inr(m.totalCost, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 text-xs text-slate-600">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Amount in words</div>
            <div className="font-bold text-slate-800 mt-0.5">{amountInWords(inv.grandTotal ?? 0)}</div>
            {payments.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payments</div>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between max-w-[220px] tabular-nums">
                    <span>{p.mode}</span><span>₹{inr(p.amount, 2)}</span>
                  </div>
                ))}
              </div>
            )}
            {inv.notes && <div className="mt-3 whitespace-pre-line"><span className="font-bold">Note:</span> {inv.notes}</div>}
          </div>
          <div className="w-full sm:w-64 text-xs space-y-1.5">
            <TotalRow label="Subtotal" val={inv.subtotal ?? 0} />
            {(inv.discountAmount ?? 0) > 0 && <TotalRow label={`Discount ${inv.discountType === "%" ? `(${inv.discountValue}%)` : ""}`} val={-(inv.discountAmount ?? 0)} />}
            {isGst && (
              <>
                <TotalRow label={`CGST ${(gstPct / 2).toFixed(1)}%`} val={(inv.gstAmount ?? 0) / 2} />
                <TotalRow label={`SGST ${(gstPct / 2).toFixed(1)}%`} val={(inv.gstAmount ?? 0) / 2} />
              </>
            )}
            {(inv.oldMetalDeduction ?? 0) > 0 && <TotalRow label="Old metal" val={-(inv.oldMetalDeduction ?? 0)} />}
            {(inv.roundOff ?? 0) !== 0 && <TotalRow label="Round off" val={inv.roundOff ?? 0} />}
            <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 text-sm font-extrabold">
              <span>Grand Total</span><span className="tabular-nums">₹{inr(inv.grandTotal ?? 0)}</span>
            </div>
            <TotalRow label="Paid" val={inv.amountPaid ?? 0} />
            <div className={`flex justify-between font-extrabold ${(inv.balanceDue ?? 0) > 0 ? "text-red-600" : "text-emerald-700"}`}>
              <span>Balance Due</span><span className="tabular-nums">₹{inr(inv.balanceDue ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end mt-10 pt-4 text-[10px] text-slate-500">
          <div>
            <div className="border-t border-slate-400 pt-1 w-40">Customer signature</div>
          </div>
          <div className="text-right">
            <div className="border-t border-slate-400 pt-1 w-40">For {shop?.shopName ?? "Shivaa Jewellers"}</div>
          </div>
        </div>
        <div className="text-center text-[9px] text-slate-400 mt-4">
          {isGst ? "Subject to local jurisdiction · E. & O. E." : "This is an estimate, not a tax invoice · E. & O. E."}
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, val }: { label: string; val: number }) {
  const neg = val < 0;
  return (
    <div className="flex justify-between">
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums font-bold ${neg ? "text-emerald-700" : ""}`}>{neg ? "− " : ""}₹{inr(Math.abs(val), 2)}</span>
    </div>
  );
}
