"use client";

import { useActionState } from "react";
import { en } from "@/lib/i18n/en";
import { unlockAction, type MemberFormState } from "../actions";
import { Callout, fieldClass, PinkButton } from "@/components/member/ui";

export function UnlockForm() {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(unlockAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-small font-semibold">
        {en.pin.pinLabel}
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="off"
          autoFocus
          required
          className={`${fieldClass} text-center text-title-2 tracking-[0.5em]`}
        />
      </label>
      {state.error && <Callout tone="error">{state.error}</Callout>}
      <PinkButton disabled={pending}>{pending ? "Checking…" : en.pin.unlock}</PinkButton>
    </form>
  );
}
