"use client";

import { useActionState } from "react";
import { signInAction, verifyCodeAction, type FormState } from "../actions";
import { Field, inputClass, Notice, PrimaryButton } from "@/components/admin/ui";

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <PrimaryButton disabled={pending}>Continue</PrimaryButton>
    </form>
  );
}

export function VerifyCodeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyCodeAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="6-digit code from your authenticator app">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className={inputClass} />
      </Field>
      <PrimaryButton disabled={pending}>Sign in</PrimaryButton>
    </form>
  );
}
