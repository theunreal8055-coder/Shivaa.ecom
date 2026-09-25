"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { idle } from "@/lib/actions/helpers";
import { Field, Input, SubmitBtn, Msg } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState(login, idle);
  return (
    <form action={action} className="space-y-4">
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" placeholder="owner@shivaa.in" required />
      </Field>
      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
      </Field>
      <Msg state={state} />
      <SubmitBtn full label="Unlock the vault" pendingLabel="Checking…" />
    </form>
  );
}
