"use client";

import { useActionState } from "react";
import { en } from "@/lib/i18n/en";
import { redeemLinkAction, type MemberFormState } from "../../actions";
import { Callout, PinkButton } from "@/components/member/ui";

const box =
  "h-[52px] w-full rounded-md border border-control-border bg-surface-0 px-3 text-center text-body text-ink focus-visible:outline-2";

export function SignInForm({ token, name, expires }: { token: string; name: string; expires: string }) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(redeemLinkAction, {});
  return (
    <form action={action} className="flex flex-1 flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-small font-semibold text-ink">{en.signIn.dobLegend}</legend>
        <div className="grid grid-cols-3 gap-2.5">
          <label className="flex flex-col gap-1.5 text-small text-text-secondary">
            {en.signIn.day}
            <input name="day" inputMode="numeric" autoComplete="bday-day" maxLength={2} required className={box} />
          </label>
          <label className="flex flex-col gap-1.5 text-small text-text-secondary">
            {en.signIn.month}
            <input name="month" inputMode="numeric" autoComplete="bday-month" maxLength={2} required className={box} />
          </label>
          <label className="flex flex-col gap-1.5 text-small text-text-secondary">
            {en.signIn.year}
            <input name="year" inputMode="numeric" autoComplete="bday-year" maxLength={4} required className={box} />
          </label>
        </div>
      </fieldset>
      {state.error ? <Callout tone="error">{state.error}</Callout> : <Callout>{en.signIn.linkNote(expires)}</Callout>}
      <div className="mt-auto flex flex-col gap-3">
        <PinkButton disabled={pending}>{pending ? "Checking…" : en.signIn.continue}</PinkButton>
        <p className="text-center text-small text-text-secondary">
          {en.signIn.notMe(name)} {en.signIn.tellUs} using the number below.
        </p>
      </div>
    </form>
  );
}
