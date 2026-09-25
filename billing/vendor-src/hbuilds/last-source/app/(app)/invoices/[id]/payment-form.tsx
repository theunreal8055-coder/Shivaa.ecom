"use client";

import { useActionState, useEffect, useState } from "react";
import { IndianRupee } from "lucide-react";
import { recordInvoicePayment } from "@/lib/actions/invoices";
import { idle } from "@/lib/actions/state";
import { PAYMENT_MODES } from "@/lib/utils";
import { Button, Field, Input, Modal, Msg, Select, SubmitBtn } from "@/components/ui";

export function PaymentButton({ invoiceId, balanceDue }: { invoiceId: number; balanceDue: number }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(recordInvoicePayment, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  if (balanceDue <= 0) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm"><IndianRupee size={14} /> Receive Payment</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Receive Payment">
        <form action={action} className="space-y-4">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <Field label={`Amount (₹) — due ₹${balanceDue.toLocaleString("en-IN")}`}>
            <Input name="amount" type="number" step="0.01" min="0.01" max={balanceDue} defaultValue={balanceDue} required autoFocus />
          </Field>
          <Field label="Mode">
            <Select name="mode" defaultValue="Cash">{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</Select>
          </Field>
          <Msg state={state} />
          <SubmitBtn label="Record Payment" pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}
