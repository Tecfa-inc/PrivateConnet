"use client";

import { useActionState } from "react";
import { en } from "@/lib/i18n/en";
import { setPinAction, type MemberFormState } from "@/app/(member)/actions";
import { Callout, fieldClass, PinkButton } from "./ui";

/** Set or change the device PIN (ONB-10). The phone's own number keypad is used via inputMode. */
export function PinForm({ submitLabel, next }: { submitLabel: string; next: "home" | "settings" }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(setPinAction, {});
  const e = state.fieldErrors ?? {};
  const pinField = `${fieldClass} text-center text-title-2 tracking-[0.5em]`;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5 text-small font-semibold">
        {en.pin.pinLabel}
        <input name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required className={pinField} />
        {e.pin && <span className="font-semibold text-danger-800">{e.pin}</span>}
      </label>
      <label className="flex flex-col gap-1.5 text-small font-semibold">
        {en.pin.confirmLabel}
        <input name="confirm" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required className={pinField} />
        {e.confirm && <span className="font-semibold text-danger-800">{e.confirm}</span>}
      </label>
      {state.error && !e.pin && !e.confirm && <Callout tone="error">{state.error}</Callout>}
      <PinkButton disabled={pending}>{pending ? "Saving…" : submitLabel}</PinkButton>
    </form>
  );
}
