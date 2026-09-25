"use client";

import { useActionState } from "react";
import { updateRates } from "@/lib/actions/settings";
import { idle } from "@/lib/actions/state";
import { Field, Input, SubmitBtn, Msg } from "./ui";

export function RatesForm({ goldRate, silverRate }: { goldRate: number; silverRate: number }) {
  const [state, action] = useActionState(updateRates, idle);
  return (
    <form action={action} className="grid grid-cols-2 gap-3 items-end sm:grid-cols-[1fr_1fr_auto]">
      <Field label="Gold rate (₹/g)">
        <Input name="goldRate" type="number" step="0.01" min="0" defaultValue={goldRate} required />
      </Field>
      <Field label="Silver rate (₹/g)">
        <Input name="silverRate" type="number" step="0.01" min="0" defaultValue={silverRate} required />
      </Field>
      <div className="col-span-2 sm:col-span-1">
        <SubmitBtn label="Update Rates" pendingLabel="Saving…" full />
      </div>
      <div className="col-span-2 sm:col-span-3"><Msg state={state} /></div>
    </form>
  );
}
