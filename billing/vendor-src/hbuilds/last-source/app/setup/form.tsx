"use client";

import { useActionState } from "react";
import { setupOwner } from "@/lib/actions/auth";
import { idle } from "@/lib/actions/state";
import { Field, Input, SubmitBtn, Msg } from "@/components/ui";

export function SetupForm() {
  const [state, action] = useActionState(setupOwner, idle);
  return (
    <form action={action} className="space-y-4">
      <Field label="Shop name">
        <Input name="shopName" placeholder="Shivaa Jewellers" defaultValue="Shivaa Jewellers" />
      </Field>
      <Field label="Your name">
        <Input name="name" placeholder="Owner" />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="owner@shivaa.in" required />
      </Field>
      <Field label="Password (min 6 characters)">
        <Input name="password" type="password" autoComplete="new-password" required minLength={6} />
      </Field>
      <Msg state={state} />
      <SubmitBtn full label="Create owner account" pendingLabel="Creating…" />
    </form>
  );
}
