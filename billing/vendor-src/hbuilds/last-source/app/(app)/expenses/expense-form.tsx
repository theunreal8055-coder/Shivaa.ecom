"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { saveExpense } from "@/lib/actions/expenses";
import { idle } from "@/lib/actions/helpers";
import { EXPENSE_CATEGORIES, PAYMENT_MODES, today } from "@/lib/utils";
import { Button, EditIconBtn, Field, Input, Modal, Msg, Select, SubmitBtn } from "@/components/ui";
import type { expenses } from "@/lib/db/schema";

type Expense = typeof expenses.$inferSelect;

function ExpenseFields({ e }: { e?: Expense }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {e && <input type="hidden" name="id" value={e.id} />}
      <Field label="Amount (₹)">
        <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={e?.amount || ""} required autoFocus={!e} />
      </Field>
      <Field label="Date">
        <Input name="date" type="date" defaultValue={e?.date ?? today()} />
      </Field>
      <Field label="Category">
        <Select name="category" defaultValue={e?.category ?? "General"}>
          {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </Field>
      <Field label="Payment mode">
        <Select name="paymentMode" defaultValue={e?.paymentMode ?? "Cash"}>
          {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <Field label="Description" className="col-span-2">
        <Input name="description" defaultValue={e?.description ?? ""} placeholder="e.g. Shop electricity bill" />
      </Field>
    </div>
  );
}

export function AddExpenseButton() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveExpense, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Add Expense</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense">
        <form action={action} className="space-y-4"><ExpenseFields /><Msg state={state} /><SubmitBtn label="Save Expense" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}

export function EditExpenseButton({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveExpense, idle);
  useEffect(() => { if (state.ok) setOpen(false); }, [state]);
  return (
    <>
      <EditIconBtn onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Edit Expense">
        <form action={action} className="space-y-4"><ExpenseFields e={expense} /><Msg state={state} /><SubmitBtn label="Update" pendingLabel="Saving…" full /></form>
      </Modal>
    </>
  );
}
