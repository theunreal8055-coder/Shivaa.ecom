"use client";

import { useActionState } from "react";
import { updateShop } from "@/lib/actions/settings";
import { changePassword } from "@/lib/actions/auth";
import { idle } from "@/lib/actions/helpers";
import { Field, Input, Msg, SubmitBtn, Textarea } from "@/components/ui";

type Settings = {
  shopName: string | null; tagline: string | null; address: string | null;
  phone: string | null; gstin: string | null; invoicePrefix: string | null; gstPercent: number | null;
};

export function ShopForm({ s }: { s: Settings }) {
  const [state, action] = useActionState(updateShop, idle);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Shop name" className="col-span-2">
          <Input name="shopName" defaultValue={s.shopName ?? ""} required />
        </Field>
        <Field label="Tagline" className="col-span-2">
          <Input name="tagline" defaultValue={s.tagline ?? ""} placeholder="Printed under the shop name" />
        </Field>
        <Field label="Phone"><Input name="phone" defaultValue={s.phone ?? ""} inputMode="tel" /></Field>
        <Field label="GSTIN"><Input name="gstin" defaultValue={s.gstin ?? ""} /></Field>
        <Field label="Invoice prefix"><Input name="invoicePrefix" defaultValue={s.invoicePrefix ?? "SHV"} /></Field>
        <Field label="GST %"><Input name="gstPercent" type="number" step="0.1" min="0" defaultValue={s.gstPercent ?? 3} /></Field>
        <Field label="Address" className="col-span-2">
          <Textarea name="address" rows={3} defaultValue={s.address ?? ""} />
        </Field>
      </div>
      <Msg state={state} />
      <SubmitBtn label="Save Shop Details" pendingLabel="Saving…" full />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, idle);
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current password" className="col-span-2">
          <Input name="current" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" className="col-span-2">
          <Input name="next" type="password" minLength={6} required autoComplete="new-password" />
        </Field>
      </div>
      <Msg state={state} />
      <SubmitBtn label="Change Password" pendingLabel="Updating…" full variant="ghost" />
    </form>
  );
}
