"use client";

import { useActionState } from "react";
import { submitProfileEditAction, type MemberFormState } from "../../actions";
import { Callout, fieldClass, PinkButton } from "@/components/member/ui";

type Values = {
  displayName: string;
  bio: string;
  occupation: string;
  interests: string[];
  lookingFor: string;
  gender: string;
  showGender: boolean;
  showOccupation: boolean;
};

export function EditProfileForm({
  values,
  interests,
  labels,
}: {
  values: Values;
  interests: readonly string[];
  labels: { lookingFor: Record<string, string>; gender: Record<string, string> };
}) {
  const [state, action, pending] = useActionState<MemberFormState, FormData>(submitProfileEditAction, {});
  const e = state.fieldErrors ?? {};
  const err = (k: string) => e[k] && <span className="text-small font-semibold text-danger-800">{e[k]}</span>;

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Callout tone="error">{state.error}</Callout>}
      {state.notice && <Callout tone="success">{state.notice}</Callout>}

      <label className="flex flex-col gap-1.5 text-small font-semibold">
        Display name
        <input name="displayName" defaultValue={values.displayName} required maxLength={40} className={fieldClass} />
        {err("displayName")}
      </label>

      <label className="flex flex-col gap-1.5 text-small font-semibold">
        About you
        <textarea name="bio" defaultValue={values.bio} required maxLength={500} rows={5} className={`${fieldClass} h-auto py-3`} />
        <span className="font-normal text-text-secondary">Up to 500 characters. No phone numbers, links, social handles or prices.</span>
        {err("bio")}
      </label>

      <label className="flex flex-col gap-1.5 text-small font-semibold">
        Looking for
        <select name="lookingFor" defaultValue={values.lookingFor} className={fieldClass}>
          {Object.entries(labels.lookingFor).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {err("lookingFor")}
      </label>

      <label className="flex flex-col gap-1.5 text-small font-semibold">
        Gender (optional)
        <select name="gender" defaultValue={values.gender} className={fieldClass}>
          <option value="">Not given</option>
          {Object.entries(labels.gender).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-touch items-center gap-3">
        <input type="checkbox" name="showGender" defaultChecked={values.showGender} className="size-6 accent-ink" />
        Show my gender on my profile
      </label>

      <label className="flex flex-col gap-1.5 text-small font-semibold">
        Occupation (optional)
        <input name="occupation" defaultValue={values.occupation} maxLength={60} className={fieldClass} />
        {err("occupation")}
      </label>
      <label className="flex min-h-touch items-center gap-3">
        <input type="checkbox" name="showOccupation" defaultChecked={values.showOccupation} className="size-6 accent-ink" />
        Show my occupation on my profile
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-small font-semibold">Interests (up to 8)</legend>
        {err("interests")}
        <div className="flex flex-wrap gap-2">
          {interests.map((i) => (
            <label key={i} className="flex min-h-touch items-center gap-2 rounded-full border border-control-border px-3.5">
              <input type="checkbox" name="interests" value={i} defaultChecked={values.interests.includes(i)} className="size-5 accent-ink" />
              {i}
            </label>
          ))}
        </div>
      </fieldset>

      <PinkButton disabled={pending}>{pending ? "Sending…" : "Send for review"}</PinkButton>
    </form>
  );
}
