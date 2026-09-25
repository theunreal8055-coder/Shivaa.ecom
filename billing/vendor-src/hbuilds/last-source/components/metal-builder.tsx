"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createMetalBill, type MetalBillPayload } from "@/lib/actions/metal";
import type { MetalInRow, MetalOutRow } from "@/lib/db/schema";
import { gm, PURITIES, today } from "@/lib/utils";
import { Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";

type StockItem = {
  id: number; name: string; huid: string | null; metal: string | null;
  purity: string | null; netWt: number | null;
};
type PartyOpt = { id: number; name: string };

type OutRow = MetalOutRow & { uid: number; locked: boolean };
type InRow = MetalInRow & { uid: number };

let seq = 1;
const uid = () => seq++;

export function MetalBuilder({
  customersList, suppliersList, stock,
}: {
  customersList: PartyOpt[]; suppliersList: PartyOpt[]; stock: StockItem[];
}) {
  const [partyType, setPartyType] = useState<"customer" | "supplier" | "other">("customer");
  const [partyId, setPartyId] = useState<number | "">("");
  const [partyName, setPartyName] = useState("");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");

  const [outRows, setOutRows] = useState<OutRow[]>([]);
  const [inRows, setInRows] = useState<InRow[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const usedIds = new Set(outRows.map((r) => r.inventoryId).filter(Boolean));
  const availableStock = stock.filter((s) => !usedIds.has(s.id));

  const patchOut = (u: number, patch: Partial<OutRow>) =>
    setOutRows((rows) => rows.map((r) => {
      if (r.uid !== u) return r;
      const next = { ...r, ...patch };
      next.fineWt = next.netWt + next.netWt * (next.wastage / 100);
      return next;
    }));

  const addOutFromStock = (id: number) => {
    const s = stock.find((x) => x.id === id);
    if (!s) return;
    const netWt = s.netWt ?? 0;
    setOutRows((rows) => [...rows, {
      uid: uid(), locked: true, inventoryId: s.id, name: s.name,
      metal: s.metal ?? "Gold", purity: s.purity ?? "22K (916)",
      netWt, wastage: 0, fineWt: netWt,
    }]);
  };

  const addOutCustom = () =>
    setOutRows((rows) => [...rows, {
      uid: uid(), locked: false, inventoryId: null, name: "",
      metal: "Gold", purity: "22K (916)", netWt: 0, wastage: 0, fineWt: 0,
    }]);

  const patchIn = (u: number, patch: Partial<InRow>) =>
    setInRows((rows) => rows.map((r) => {
      if (r.uid !== u) return r;
      const next = { ...r, ...patch };
      next.fineWt = next.gross * (next.tunch / 100);
      return next;
    }));

  const addIn = () =>
    setInRows((rows) => [...rows, {
      uid: uid(), metalType: "Gold", name: "Raw metal", gross: 0, tunch: 100, fineWt: 0,
    }]);

  const totals = useMemo(() => {
    const by = (rows: { metal?: string; metalType?: string; fineWt: number }[], m: string) =>
      rows.filter((r) => ((r as MetalOutRow).metal || (r as MetalInRow).metalType || "Gold").toLowerCase() === m)
        .reduce((s, r) => s + (r.fineWt || 0), 0);
    const outG = by(outRows, "gold"), inG = by(inRows, "gold");
    const outS = by(outRows, "silver"), inS = by(inRows, "silver");
    return { outG, inG, balG: outG - inG, outS, inS, balS: outS - inS };
  }, [outRows, inRows]);

  const pickParty = (id: number | "") => {
    setPartyId(id);
    const list = partyType === "customer" ? customersList : suppliersList;
    const p = list.find((x) => x.id === id);
    setPartyName(p?.name ?? "");
  };

  const submit = () => {
    setError("");
    const payload: MetalBillPayload = {
      partyType,
      partyId: partyType === "other" ? null : (partyId === "" ? null : Number(partyId)),
      partyName, date, notes,
      outProducts: outRows.map(({ uid: _u, locked: _l, ...rest }) => rest),
      inMetals: inRows.map(({ uid: _u, ...rest }) => rest),
    };
    start(async () => {
      const res = await createMetalBill(payload);
      if (res && !res.ok) setError(res.message);
    });
  };

  const numIn = (v: string) => parseFloat(v) || 0;
  const partyList = partyType === "customer" ? customersList : suppliersList;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
      <div className="space-y-4 min-w-0">
        <Card>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Party type">
              <div className="flex rounded-xl border border-edge bg-panel2 p-1">
                {(["customer", "supplier", "other"] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => { setPartyType(t); setPartyId(""); setPartyName(""); }}
                    className={cx("flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-bold capitalize transition-colors",
                      partyType === t ? "bg-gold text-vault" : "text-mut")}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Party" className="col-span-2 sm:col-span-2">
              {partyType === "other" ? (
                <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Party name" />
              ) : (
                <Select value={partyId} onChange={(e) => pickParty(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— Select {partyType} —</option>
                  {partyList.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Date">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Metal OUT */}
        <Card title="Metal Out (given)"
          actions={
            <div className="flex items-center gap-2">
              {availableStock.length > 0 && (
                <select
                  className="rounded-lg border border-edge bg-panel2 px-2.5 py-1.5 text-xs font-bold text-slate-200 max-w-[170px]"
                  value=""
                  onChange={(e) => { if (e.target.value) addOutFromStock(Number(e.target.value)); e.target.value = ""; }}>
                  <option value="">+ From stock…</option>
                  {availableStock.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {gm(s.netWt)}g</option>
                  ))}
                </select>
              )}
              <Button variant="subtle" size="sm" onClick={addOutCustom}><Plus size={14} /> Custom</Button>
            </div>
          }>
          {outRows.length === 0 ? (
            <p className="text-sm text-mut py-1">Products or metal handed out. Fine = net + wastage%.</p>
          ) : (
            <div className="space-y-3">
              {outRows.map((r) => (
                <div key={r.uid} className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    <Field label="Item" className="col-span-2">
                      <Input value={r.name} disabled={r.locked} placeholder="Item / metal"
                        onChange={(e) => patchOut(r.uid, { name: e.target.value })} />
                    </Field>
                    <Field label="Metal / Purity">
                      {r.locked ? <Input value={`${r.metal} ${r.purity}`} disabled />
                        : (
                          <div className="flex gap-1.5">
                            <Select value={r.metal} onChange={(e) => patchOut(r.uid, { metal: e.target.value })} className="w-1/2">
                              <option>Gold</option><option>Silver</option>
                            </Select>
                            <Select value={r.purity} onChange={(e) => patchOut(r.uid, { purity: e.target.value })} className="w-1/2">
                              {PURITIES.map((p) => <option key={p}>{p}</option>)}
                            </Select>
                          </div>
                        )}
                    </Field>
                    <Field label="Net wt (g)">
                      <Input type="number" step="0.001" min="0" value={r.netWt || ""} disabled={r.locked}
                        onChange={(e) => patchOut(r.uid, { netWt: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Wastage %">
                      <Input type="number" step="0.1" min="0" value={r.wastage || ""}
                        onChange={(e) => patchOut(r.uid, { wastage: numIn(e.target.value) })} />
                    </Field>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" onClick={() => setOutRows((rows) => rows.filter((x) => x.uid !== r.uid))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400/80 hover:text-red-400">
                      <Trash2 size={13} /> Remove
                    </button>
                    <div className="text-sm font-extrabold text-gold tabular-nums">Fine {gm(r.fineWt)}g</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Metal IN */}
        <Card title="Metal In (received)" actions={<Button variant="subtle" size="sm" onClick={addIn}><Plus size={14} /> Add</Button>}>
          {inRows.length === 0 ? (
            <p className="text-sm text-mut py-1">Raw metal received against the bill. Fine = gross × tunch%.</p>
          ) : (
            <div className="space-y-3">
              {inRows.map((r) => (
                <div key={r.uid} className="rounded-xl border border-edge bg-panel2 p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Field label="Metal">
                      <Select value={r.metalType} onChange={(e) => patchIn(r.uid, { metalType: e.target.value })}>
                        <option>Gold</option><option>Silver</option>
                      </Select>
                    </Field>
                    <Field label="Description">
                      <Input value={r.name} onChange={(e) => patchIn(r.uid, { name: e.target.value })} />
                    </Field>
                    <Field label="Gross wt (g)">
                      <Input type="number" step="0.001" min="0" value={r.gross || ""}
                        onChange={(e) => patchIn(r.uid, { gross: numIn(e.target.value) })} />
                    </Field>
                    <Field label="Tunch %">
                      <Input type="number" step="0.1" min="0" max="100" value={r.tunch || ""}
                        onChange={(e) => patchIn(r.uid, { tunch: numIn(e.target.value) })} />
                    </Field>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button type="button" onClick={() => setInRows((rows) => rows.filter((x) => x.uid !== r.uid))}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400/80 hover:text-red-400">
                      <Trash2 size={13} /> Remove
                    </button>
                    <div className="text-sm font-extrabold text-sky tabular-nums">Fine {gm(r.fineWt)}g</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional remarks" />
        </Card>
      </div>

      {/* Fine balance summary */}
      <div className="lg:sticky lg:top-20 space-y-3">
        <Card title="Fine Balance">
          <div className="space-y-3">
            {(["Gold", "Silver"] as const).map((m) => {
              const t = m === "Gold"
                ? { out: totals.outG, inn: totals.inG, bal: totals.balG }
                : { out: totals.outS, inn: totals.inS, bal: totals.balS };
              if (!t.out && !t.inn) return null;
              return (
                <div key={m} className="rounded-xl border border-edge bg-panel2 p-3 text-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-mut">{m}</div>
                  <div className="mt-1.5 space-y-1 tabular-nums">
                    <div className="flex justify-between"><span className="text-mut text-xs">Fine out</span><b>{gm(t.out)}g</b></div>
                    <div className="flex justify-between"><span className="text-mut text-xs">Fine in</span><b>{gm(t.inn)}g</b></div>
                    <div className={cx("flex justify-between border-t border-edge pt-1 font-extrabold", t.bal > 0 ? "text-red-400" : "text-emerald-400")}>
                      <span className="text-xs uppercase">Balance</span><span>{gm(t.bal)}g</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {!totals.outG && !totals.inG && !totals.outS && !totals.inS && (
              <p className="text-sm text-mut">Add rows to see the fine-weight balance.</p>
            )}
          </div>
          <p className="mt-3 text-[11px] text-mut">Positive balance = party owes you fine metal.</p>
        </Card>

        {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-300">{error}</div>}
        <Button full onClick={submit} disabled={pending}>{pending ? "Saving…" : "Save Metal Bill"}</Button>
      </div>
    </div>
  );
}
