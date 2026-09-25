"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveItem } from "@/lib/actions/inventory";
import { idle } from "@/lib/actions/helpers";
import { CATEGORIES, PURITIES } from "@/lib/utils";
import { Button, EditIconBtn, Field, Input, Modal, Msg, Select, SubmitBtn, Textarea } from "@/components/ui";
import type { inventoryItems } from "@/lib/db/schema";
import { Plus } from "lucide-react";

type Item = typeof inventoryItems.$inferSelect;

function ItemFields({ item }: { item?: Item }) {
  const [gross, setGross] = useState(item?.grossWt ?? 0);
  const [less, setLess] = useState(item?.lessWt ?? 0);
  const net = Math.max(0, gross - less);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field label="Item name" className="col-span-2 sm:col-span-3">
        <Input name="name" defaultValue={item?.name} required placeholder="e.g. Antique Jhumka" />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue={item?.category ?? "Rings"}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Metal">
        <Select name="metal" defaultValue={item?.metal ?? "Gold"}>
          <option>Gold</option><option>Silver</option>
        </Select>
      </Field>
      <Field label="Purity">
        <Select name="purity" defaultValue={item?.purity ?? "22K (916)"}>
          {PURITIES.map((p) => <option key={p}>{p}</option>)}
        </Select>
      </Field>
      <Field label="HUID">
        <Input name="huid" defaultValue={item?.huid ?? ""} placeholder="6-digit HUID" />
      </Field>
      <Field label="SKU / Tag no.">
        <Input name="sku" defaultValue={item?.sku ?? ""} placeholder="Optional" />
      </Field>
      <Field label="Pieces">
        <Input name="pieces" type="number" min="1" defaultValue={item?.pieces || 1} />
      </Field>
      <Field label="Gross wt (g)">
        <Input name="grossWt" type="number" step="0.001" min="0" defaultValue={item?.grossWt || ""}
          onChange={(e) => setGross(parseFloat(e.target.value) || 0)} required />
      </Field>
      <Field label="Less wt (g)">
        <Input name="lessWt" type="number" step="0.001" min="0" defaultValue={item?.lessWt || ""}
          onChange={(e) => setLess(parseFloat(e.target.value) || 0)} />
      </Field>
      <Field label="Net wt (auto)">
        <Input value={net.toFixed(3)} readOnly className="opacity-70" />
      </Field>
      <Field label="Stone wt (ct)">
        <Input name="stoneWt" type="number" step="0.001" min="0" defaultValue={item?.stoneWt || ""} />
      </Field>
      <Field label="Stone details" className="col-span-2">
        <Input name="stoneDetails" defaultValue={item?.stoneDetails ?? ""} placeholder="e.g. CZ, Ruby…" />
      </Field>
      <Field label="Notes" className="col-span-2 sm:col-span-3">
        <Textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} />
      </Field>
    </div>
  );
}

export function AddItemButton() {
  const sp = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveItem, idle);

  useEffect(() => {
    if (sp.get("add") === "1") { setOpen(true); router.replace("/inventory"); }
  }, [sp, router]);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Item</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Stock Item" wide>
        <form action={action} className="space-y-4">
          <ItemFields />
          <Msg state={state} />
          <SubmitBtn label="Save Item" pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}

export function EditItemButton({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveItem, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit · ${item.name}`} wide>
        <form action={action} className="space-y-4">
          <ItemFields item={item} />
          <Msg state={state} />
          <SubmitBtn label="Update Item" pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}
