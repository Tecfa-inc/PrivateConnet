"use client";

import { useActionState } from "react";
import { confirmTwoStepAction, startTwoStepAction, type FormState } from "../actions";
import { Field, inputClass, Notice, PrimaryButton } from "@/components/admin/ui";

export function SetupForm() {
  const [started, start, starting] = useActionState<FormState, FormData>(startTwoStepAction, {});
  const [confirmed, confirm, confirming] = useActionState<FormState, FormData>(confirmTwoStepAction, {});

  if (started.step !== "confirm") {
    return (
      <form action={start} className="flex flex-col gap-4">
        {started.error && <Notice tone="error">{started.error}</Notice>}
        <Field label="Your password" hint="Needed to turn on two-step sign-in.">
          <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        <PrimaryButton disabled={starting}>Continue</PrimaryButton>
      </form>
    );
  }

  const backupCodes = (started.backupCodes as string[] | undefined) ?? [];
  return (
    <div className="flex flex-col gap-5">
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        <li>Scan this code with an authenticator app (for example Google Authenticator or Microsoft Authenticator).</li>
        <li>Write down the backup codes and keep them somewhere safe and private. Each works once.</li>
        <li>Enter the 6-digit code the app shows.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated on the server */}
      <img src={started.qr as string} alt="QR code for your authenticator app" width={220} height={220} className="rounded-lg border border-line-100" />
      <ul className="grid grid-cols-2 gap-1 rounded-lg bg-surface-100 p-3 font-mono text-[15px]">
        {backupCodes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <form action={confirm} className="flex flex-col gap-4">
        {confirmed.error && <Notice tone="error">{confirmed.error}</Notice>}
        <Field label="6-digit code">
          <input name="code" inputMode="numeric" autoComplete="one-time-code" required className={inputClass} />
        </Field>
        <PrimaryButton disabled={confirming}>Turn on two-step sign-in</PrimaryButton>
      </form>
    </div>
  );
}
