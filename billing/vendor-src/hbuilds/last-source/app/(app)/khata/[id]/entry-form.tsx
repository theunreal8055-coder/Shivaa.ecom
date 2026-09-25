"use client";

import { useActionState, useEffect, useState } from "react";
import { IndianRupee, MinusCircle } from "lucide-react";
import { addLedgerEntry } from "@/lib/actions/khata";
import { idle } from "@/lib/actions/state";
import { PAYMENT_MODES, today } from "@/lib/utils";
import { Button, Field, Input, Modal, Msg, Select, SubmitBtn } from "@/components/ui";

export function KhataEntryButtons({ customerId }: { customerId: number }) {
  const [mode, setMode] = useState<"credit" | "debit" | null>(null);
  const [state, action] = useActionState(addLedgerEntry, idle);
  useEffect(() => { if (state.ok) setMode(null); }, [state]);

  const isCredit = mode === "credit";
  return (
    <>
      <Button size="sm" onClick={() => setMode("credit")}><IndianRupee size={14} /> Receive Payment</Button>
      <Button size="sm" variant="ghost" onClick={() => setMode("debit")}><MinusCircle size={14} /> Add Udhaar</Button>

      <Modal open={mode !== null} onClose={() => setMode(null)} title={isCredit ? "Receive Payment" : "Add Udhaar"}>
        <form action={action} className="space-y-4">
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="type" value={mode ?? "credit"} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount (₹)">
              <Input name="amount" type="number" step="0.01" min="0.01" required autoFocus />
            </Field>
            <Field label="Date">
              <Input name="date" type="date" defaultValue={today()} />
            </Field>
            {isCredit && (
              <Field label="Mode" className="col-span-2">
                <Select name="mode" defaultValue="Cash">{PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}</Select>
              </Field>
            )}
            <Field label="Note" className="col-span-2">
              <Input name="note" placeholder={isCredit ? "e.g. part payment" : "e.g. goods given on credit"} />
            </Field>
          </div>
          <Msg state={state} />
          <SubmitBtn label={isCredit ? "Record Payment" : "Add Udhaar"} pendingLabel="Saving…" full />
        </form>
      </Modal>
    </>
  );
}
