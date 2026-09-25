"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createInvoice, type InvoicePayload } from "@/lib/actions/invoices";
import type { InvoiceItem, OldMetalRow, PaymentRow } from "@/lib/db/schema";
import { computeInvoiceTotals, gm, inr, PAYMENT_MODES, PURITIES, today } from "@/lib/utils";
import { Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";

type StockItem = {
  id: number; name: string; huid: string | null; metal: string | null;
  purity: string | null; netWt: number | null; pieces: number | null;
};
type CustomerOpt = { id: number; name: string; phone: string | null; creditDays: number | null };

type ItemRow = InvoiceItem & { uid: number; locked: boolean };
type OldRow = OldMetalRow & { uid: number };
type PayRow = PaymentRow & { uid: number };

let seq = 1;
const uid = () => seq++;

export function InvoiceBuilder({
  initialType, customersList, stock, goldRate, silverRate, gstPercent,
}: {
  initialType: "GST" | "Estimate";
  customersList: CustomerOpt[];
  stock: StockItem[];
  goldRate: number; silverRate: number; gstPercent: number;
}) {
  const [type, setType] = useState<"GST" | "Estimate">(initialType);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [date, setDate] = useState(today());
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [creditDays, setCreditDays] = useState(0);
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([]);
  const [oldMetals, setOldMetals] = useState<OldRow[]>([]);
  const [payments, setPayments] = useState<PayRow[]>([]);

  const [discountType, setDiscountType] = useState<"%" | "₹">("%");
  const [discountValue, setDiscountValue] = useState(0);
  const [roundOff, setRoundOff] = useState(0);

  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const usedStockIds = new Set(items.map((i) => i.inventoryId).filter(Boolean));
  const availableStock = stock.filter((s) => !usedStockIds.has(s.id));

  const rateFor = (metal: string) => (metal === "Silver" ? silverRate : goldRate);

  const patchItem = (u: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => {
      if (r.uid !== u) return r;
      const next = { ...r, ...patch };
      next.totalCost = next.netWt * next.rate + next.making;
      return next;
    }));

  const addStockItem = (id: number) => {
    const s = stock.find((x) => x.id === id);
    if (!s) return;
    setItems((rows) => [...rows, {
      uid: uid(), locked: true, inventoryId: s.id,
      name: s.name, huid: s.huid ?? "", metal: s.metal ?? "Gold", purity: s.purity ?? "22K (916)",
      netWt: s.netWt ?? 0, pieces: s.pieces ?? 1,
      rate: rateFor(s.metal ?? "Gold"), making: 0,
      totalCost: (s.netWt ?? 0) * rateFor(s.metal ?? "Gold"),
    }]);
  };

  const addCustomItem = () =>
    setItems((rows) => [...rows, {
      uid: uid(), locked: false, inventoryId: null,
      name: "", huid: "", metal: "Gold", purity: "22K (916)",
      netWt: 0, pieces: 1, rate: goldRate, making: 0, totalCost: 0,
    }]);

  const patchOld = (u: number, patch: Partial<OldRow>) =>
    setOldMetals((rows) => rows.map((r) => {
      if (r.uid !== u) return r;
      const next = { ...r, ...patch };
      next.netWt = next.givenWt * (next.tunch / 100);
      next.totalCost = next.netWt * next.rate;
      return next;
    }));

  const addOld = () =>
    setOldMetals((rows) => [...rows, {
      uid: uid(), metalType: "Gold", name: "Old gold", tunch: 91.6, givenWt: 0,
      netWt: 0, rate: goldRate, totalCost: 0,
    }]);

  const addPayment = () => setPayments((rows) => [...rows, { uid: uid(), amount: 0, mode: "Cash" }]);
  const patchPay = (u: number, patch: Partial<PayRow>) =>
    setPayments((rows) => rows.map((r) => (r.uid === u ? { ...r, ...patch } : r)));

  const totals = useMemo(() => computeInvoiceTotals({
    itemTotals: items.map((i) => i.totalCost),
    discountType, discountValue,
    gstPercent, applyGst: type === "GST",
    oldMetalTotals: oldMetals.map((m) => m.totalCost),
    roundOff,
    payments: payments.map((p) => p.amount),
  }), [items, discountType, discountValue, gstPercent, type, oldMetals, roundOff, payments]);

  const submit = () => {
    setError("");
    if (!customerId) { setError("Select a customer first."); return; }
    if (!items.length) { setError("Add at least one product to the bill."); return; }
    if (items.some((i) => !i.name.trim())) { setError("Every item needs a name."); return; }
    const payload: InvoicePayload = {
      type, customerId: Number(customerId), date, placeOfSupply,
      creditDays, notes, discountType, discountValue, roundOff,
      items: items.map(({ uid: _u, locked: _l, ...rest }) => rest),
      oldMetals: oldMetals.map(({ uid: _u, ...rest }) => rest),
      payments: payments.filter((p) => p.amount > 0).map(({ uid: _u, ...rest }) => rest),
    };
    start(async () => {
      const res = await createInvoice(payload);
      if (res && !res.ok) setError(res.message);
    });
  };

  const numIn = (v: string) => parseFloat(v) || 0;

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        {/* Header */}
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Bill type">
              <div className="flex rounded-xl border border-edge bg-panel2 p-1">
                {(["GST", "Estimate"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className={cx("flex-1 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors",
                      type === t ? "bg-gold text-vault" : "text-mut")}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Customer" className="col-span-2">
              <Select value={customerId} onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : "";
                setCustomerId(id);
                const c = customersList.find((x) => x.id === id);
                if (c) setCreditDays(c.creditDays ?? 0);
              }}>
                <option value="">— Select customer —</option>
                {customersList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>
                ))}
              </Select>
            </Field>
            <Field label="Place of supply" className="col-span-2 sm:col-span-2">
              <Input value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="e.g. Uttar Pradesh" />
            </Field>
            <Field label="Credit days">
              <Input type="number" min="0" value={creditDays} onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)} />
            </Field>
          </div>
          {customersList.length === 0 && (
            <p className="mt-3 text-xs text-amber-300">No customers yet — add one under <a className="underline" href="/parties?tab=customers&add=1">Parties</a> first.</p>
          )}
        </Card>

        {/* Items */}
        <Card title="Products"
          actions={
            <div className="flex items-center gap-2">
              {availableStock.length > 0 && (
                <select
                  className="rounded-lg border border-edge bg-panel2 px-2.5 py-1.5 text-xs font-bold text-slate-200 max-w-[180px]"
                  value=""
                  onChange={(e) => { if (e.target.value) addStockItem(Number(e.target.value)); e.target.value = ""; }}
                >
                  <option value="">+ From stock…</option>
                  {availableStock.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {gm(s.netWt)}g {s.huid ? `· ${s.huid}` : ""}</option>
                  ))}
                </select>
              )}
              <Button variant="subtle" size="sm" onClick={addCustomItem}><Plus size={14} /> Custom</Button>
            </div>
          }>
          {items.length === 0 ? (
            <p className="text-sm text-mut py-2">Pick items from stock or add a custom line.</p>
          ) : (
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.uid} className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Field label="Item" className="col-span-2">
                      <Input value={it.name} disabled={it.locked} placeholder="Item name"
                        onChange={(e) => patchItem(it.uid, { name: e.target.value })} />
                    </Field>
                    <Field label="HUID">
                      <Input value={it.huid} disabled={it.locked}
                        onChange={(e) => patchItem(it.uid, { huid: e.target.value })} />
                    </Field>
                    <Field label="Purity">
                      {it.locked ? <Input value={`${it.metal} · ${it.purity}`} disabled />
                        : (
                          <div className="flex gap-1.5">
                            <Select value={it.metal} onChange={(e) => {
                              const metal = e.target.value;
                              patchItem(it.uid, { metal, rate: rateFor(metal) });
                            }} className="w-1/2">
                              <option>Gold</option><option>Silver</option>
                            </Select>
                            <Select value={it.purity} onChange={(e) => patchItem(it.uid, { purity: e.target.value })} className="w-1/2">
                              {PURITIES.map((p) => <option key={p}>{p}</option>)}
                            </Select>
                          </div>
                        )}
                    </Field>
                    <Field label="Net wt (g)">
                      <Input type="number" step="0.001" min="0" value={it.netWt || ""} disabled={it.locked}
                        onChange={(e) => patchItem(it.uid, { netWt: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Pcs">
                      <Input type="number" min="1" value={it.pieces}
                        onChange={(e) => patchItem(it.uid, { pieces: parseInt(e.target.value) || 1 })} />
                    </Field>
                    <Field label="Rate (₹/g)">
                      <Input type="number" step="0.01" min="0" value={it.rate || ""}
                        onChange={(e) => patchItem(it.uid, { rate: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Making (₹)">
                      <Input type="number" step="0.01" min="0" value={it.making || ""}
                        onChange={(e) => patchItem(it.uid, { making: numIn(e.target.value) })} />
                    </Field>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" onClick={() => setItems((rows) => rows.filter((r) => r.uid !== it.uid))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400/80 hover:text-red-400">
                      <Trash2 size={13} /> Remove
                    </button>
                    <div className="text-sm font-extrabold text-gold tabular-nums">₹{inr(it.totalCost, 2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Old metal exchange */}
        <Card title="Old Metal Exchange" actions={<Button variant="subtle" size="sm" onClick={addOld}><Plus size={14} /> Add</Button>}>
          {oldMetals.length === 0 ? (
            <p className="text-sm text-mut py-1">Optional — customer’s old gold/silver deducted from the bill at tunch value.</p>
          ) : (
            <div className="space-y-3">
              {oldMetals.map((m) => (
                <div key={m.uid} className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <Field label="Metal">
                      <Select value={m.metalType} onChange={(e) => {
                        const metalType = e.target.value;
                        patchOld(m.uid, { metalType, rate: rateFor(metalType) });
                      }}>
                        <option>Gold</option><option>Silver</option>
                      </Select>
                    </Field>
                    <Field label="Description">
                      <Input value={m.name} onChange={(e) => patchOld(m.uid, { name: e.target.value })} />
                    </Field>
                    <Field label="Given wt (g)">
                      <Input type="number" step="0.001" min="0" value={m.givenWt || ""}
                        onChange={(e) => patchOld(m.uid, { givenWt: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Tunch %">
                      <Input type="number" step="0.1" min="0" max="100" value={m.tunch || ""}
                        onChange={(e) => patchOld(m.uid, { tunch: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Rate (₹/g)">
                      <Input type="number" step="0.01" min="0" value={m.rate || ""}
                        onChange={(e) => patchOld(m.uid, { rate: numIn(e.target.value) })} />
                    </Field>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" onClick={() => setOldMetals((rows) => rows.filter((r) => r.uid !== m.uid))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400/80 hover:text-red-400">
                      <Trash2 size={13} /> Remove
                    </button>
                    <div className="text-[11px] text-mut">
                      Fine {gm(m.netWt)}g → <span className="text-sm font-extrabold text-emerald-400 tabular-nums">− ₹{inr(m.totalCost, 2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payments */}
        <Card title="Payments Received" actions={<Button variant="subtle" size="sm" onClick={addPayment}><Plus size={14} /> Add</Button>}>
          {payments.length === 0 ? (
            <p className="text-sm text-mut py-1">Leave empty for full udhaar — balance goes to the customer’s khata.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.uid} className="flex items-center gap-2">
                  <Input type="number" step="0.01" min="0" value={p.amount || ""} placeholder="Amount"
                    onChange={(e) => patchPay(p.uid, { amount: numIn(e.target.value) })} className="flex-1" />
                  <Select value={p.mode} onChange={(e) => patchPay(p.uid, { mode: e.target.value })} className="w-36">
                    {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                  </Select>
                  <button type="button" onClick={() => setPayments((rows) => rows.filter((r) => r.uid !== p.uid))}
                    className="p-2 text-red-400/80 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remarks printed on the bill" />
        </Card>
      </div>

      {/* Summary */}
      <div className="lg:sticky lg:top-20 space-y-3">
        <Card title="Bill Summary">
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={`₹${inr(totals.subtotal, 2)}`} />
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-edge bg-panel2 p-0.5">
                {(["%", "₹"] as const).map((d) => (
                  <button key={d} type="button" onClick={() => setDiscountType(d)}
                    className={cx("rounded-md px-2 py-1 text-[11px] font-bold", discountType === d ? "bg-gold text-vault" : "text-mut")}>
                    {d}
                  </button>
                ))}
              </div>
              <Input type="number" step="0.01" min="0" value={discountValue || ""} placeholder="Discount"
                onChange={(e) => setDiscountValue(numIn(e.target.value))} className="flex-1" />
            </div>
            {totals.discountAmount > 0 && <Row label="Discount" value={`− ₹${inr(totals.discountAmount, 2)}`} tone="text-emerald-400" />}
            <Row label="Taxable" value={`₹${inr(totals.taxable, 2)}`} />
            {type === "GST" && (
              <>
                <Row label={`CGST ${(gstPercent / 2).toFixed(1)}%`} value={`₹${inr(totals.cgst, 2)}`} />
                <Row label={`SGST ${(gstPercent / 2).toFixed(1)}%`} value={`₹${inr(totals.sgst, 2)}`} />
              </>
            )}
            {totals.oldMetalDeduction > 0 && <Row label="Old metal" value={`− ₹${inr(totals.oldMetalDeduction, 2)}`} tone="text-emerald-400" />}
            <div className="flex items-center gap-2">
              <span className="text-mut text-xs font-bold uppercase tracking-wider flex-1">Round off</span>
              <Input type="number" step="0.01" value={roundOff || ""} placeholder="±0"
                onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)} className="w-24 text-right" />
            </div>
            <div className="border-t border-edge pt-2 flex items-baseline justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mut">Grand Total</span>
              <span className="text-xl font-extrabold text-gold tabular-nums">₹{inr(totals.grandTotal)}</span>
            </div>
            {totals.amountPaid > 0 && <Row label="Paid" value={`₹${inr(totals.amountPaid, 2)}`} tone="text-emerald-400" />}
            <Row label="Balance due" value={`₹${inr(totals.balanceDue, 2)}`} tone={totals.balanceDue > 0 ? "text-red-400" : "text-emerald-400"} />
          </div>
        </Card>

        {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-300">{error}</div>}

        <Button full onClick={submit} disabled={pending}>
          {pending ? "Saving…" : `Save ${type === "GST" ? "GST Invoice" : "Estimate"}`}
        </Button>
        <p className="text-[11px] text-mut">Stock items are marked <b>Sold</b>, the total is posted to the customer’s khata, and payments are credited automatically.</p>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-mut text-xs font-bold uppercase tracking-wider">{label}</span>
      <span className={cx("font-bold tabular-nums", tone)}>{value}</span>
    </div>
  );
}
