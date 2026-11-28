"use client";

import { useActionState } from "react";
import { en } from "@/lib/i18n/en";
import { confirmProfileAction, type MemberFormState } from "../actions";
import { Callout, PinkButton } from "@/components/member/ui";

export function PublishForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(confirmProfileAction, {});
  return (
    <form action={action} className="mt-2 flex flex-col gap-4">
      <label className="flex items-start gap-3 text-[16px] leading-[23px] text-text-muted">
        <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-6 shrink-0 accent-ink" />
        <span>{en.onboarding.acceptTerms}</span>
      </label>
      {state.error && <Callout tone="error">{state.error}</Callout>}
      <PinkButton disabled={pending}>{pending ? "Publishing…" : en.onboarding.publish}</PinkButton>
    </form>
  );
}
