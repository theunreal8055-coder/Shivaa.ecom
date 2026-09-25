"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { saveCustomer, saveSupplier, saveArtisan } from "@/lib/actions/parties";
import { idle } from "@/lib/actions/helpers";
import { Button, EditIconBtn, Field, Input, Modal, Msg, SubmitBtn, Textarea } from "@/components/ui";
import type { customers, suppliers, artisans } from "@/lib/db/schema";

type Customer = typeof customers.$inferSelect;
type Supplier = typeof suppliers.$inferSelect;
type Artisan = typeof artisans.$inferSelect;

/* ---------- Customer ---------- */

function CustomerFields({ c }: { c?: Customer }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Name" className="col-span-2"><Input name="name" defaultValue={c?.name} required /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={c?.phone ?? ""} inputMode="tel" placeholder="10-digit mobile" /></Field>
      <Field label="Email"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
      <Field label="City"><Input name="city" defaultValue={c?.city ?? ""} /></Field>
      <Field label="PAN"><Input name="pan" defaultValue={c?.pan ?? ""} /></Field>
      <Field label="Aadhar"><Input name="aadhar" defaultValue={c?.aadhar ?? ""} inputMode="numeric" /></Field>
      <Field label="Credit limit (₹)"><Input name="creditLimit" type="number" min="0" defaultValue={c?.creditLimit || ""} /></Field>
      <Field label="Credit days"><Input name="creditDays" type="number" min="0" defaultValue={c?.creditDays || ""} /></Field>
      <Field label="Address" className="col-span-2"><Textarea name="address" rows={2} defaultValue={c?.address ?? ""} /></Field>
      <Field label="Notes" className="col-span-2"><Textarea name="notes" rows={2} defaultValue={c?.notes ?? ""} /></Field>
    </div>
  );
}

export function AddCustomerButton() {
  const sp = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveCustomer, idle);
  useEffect(() => {
    if (sp.get("add") === "1" && (sp.get("tab") ?? "customers") === "customers") {
      setOpen(true); router.replace("/parties?tab=customers");
    }
  }, [sp, router]);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Customer</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Customer">
        <form action={action} className="space-y-4"><CustomerFields /><Msg state={state} /><SubmitBtn label="Save Customer" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

export function EditCustomerButton({ c }: { c: Customer }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveCustomer, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit · ${c.name}`}>
        <form action={action} className="space-y-4"><CustomerFields c={c} /><Msg state={state} /><SubmitBtn label="Update" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

/* ---------- Supplier ---------- */

function SupplierFields({ s }: { s?: Supplier }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Field label="Contact name" className="col-span-2 sm:col-span-1"><Input name="name" defaultValue={s?.name} required /></Field>
      <Field label="Company" className="col-span-2 sm:col-span-1"><Input name="company" defaultValue={s?.company ?? ""} /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={s?.phone ?? ""} inputMode="tel" /></Field>
      <Field label="City"><Input name="city" defaultValue={s?.city ?? ""} /></Field>
      <Field label="PAN"><Input name="pan" defaultValue={s?.pan ?? ""} /></Field>
      <Field label="GSTIN"><Input name="gstin" defaultValue={s?.gstin ?? ""} /></Field>
      <Field label="Account name"><Input name="accName" defaultValue={s?.accName ?? ""} /></Field>
      <Field label="Account no."><Input name="accNumber" defaultValue={s?.accNumber ?? ""} /></Field>
      <Field label="IFSC"><Input name="ifsc" defaultValue={s?.ifsc ?? ""} /></Field>
      <Field label="Address" className="col-span-2"><Textarea name="address" rows={2} defaultValue={s?.address ?? ""} /></Field>
      <Field label="Notes" className="col-span-2"><Textarea name="notes" rows={2} defaultValue={s?.notes ?? ""} /></Field>
    </div>
  );
}

export function AddSupplierButton() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveSupplier, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Supplier</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Supplier">
        <form action={action} className="space-y-4"><SupplierFields /><Msg state={state} /><SubmitBtn label="Save Supplier" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

export function EditSupplierButton({ s }: { s: Supplier }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveSupplier, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit · ${s.name}`}>
        <form action={action} className="space-y-4"><SupplierFields s={s} /><Msg state={state} /><SubmitBtn label="Update" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

/* ---------- Artisan (Karigar) ---------- */

function ArtisanFields({ a }: { a?: Artisan }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {a && <input type="hidden" name="id" value={a.id} />}
      <Field label="Name" className="col-span-2"><Input name="name" defaultValue={a?.name} required /></Field>
      <Field label="Phone"><Input name="phone" defaultValue={a?.phone ?? ""} inputMode="tel" /></Field>
      <Field label="Specialization"><Input name="specialization" defaultValue={a?.specialization ?? ""} placeholder="e.g. Kundan setting" /></Field>
      <Field label="Address" className="col-span-2"><Textarea name="address" rows={2} defaultValue={a?.address ?? ""} /></Field>
      <Field label="Notes" className="col-span-2"><Textarea name="notes" rows={2} defaultValue={a?.notes ?? ""} /></Field>
    </div>
  );
}

export function AddArtisanButton() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveArtisan, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Karigar</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Karigar">
        <form action={action} className="space-y-4"><ArtisanFields /><Msg state={state} /><SubmitBtn label="Save Karigar" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

export function EditArtisanButton({ a }: { a: Artisan }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveArtisan, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title={`Edit · ${a.name}`}>
        <form action={action} className="space-y-4"><ArtisanFields a={a} /><Msg state={state} /><SubmitBtn label="Update" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}
