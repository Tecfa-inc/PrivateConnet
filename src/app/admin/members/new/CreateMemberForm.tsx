"use client";

import { useActionState } from "react";
import { createMemberAction, type FormState } from "../../actions";
import { Field, inputClass, Notice, Panel, PrimaryButton } from "@/components/admin/ui";
import { LinkHandover } from "@/components/admin/LinkHandover";

type City = { id: string; label: string };

export function CreateMemberForm({ cities, interests }: { cities: City[]; interests: readonly string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createMemberAction, {});
  const e = state.fieldErrors ?? {};
  const created = state.created as { memberId: string; url: string; expiresAt: string } | undefined;

  if (created) return <LinkHandover {...created} heading="Member created" />;

  return (
    <form action={action} className="grid grid-cols-[1fr_340px] gap-5">
      <div className="flex flex-col gap-5">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <Panel title="Private details (encrypted, never shown to members)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Legal name" error={e.legalName}>
              <input name="legalName" required maxLength={120} className={inputClass} />
            </Field>
            <Field label="Date of birth" hint="Must be 18 or older" error={e.dateOfBirth}>
              <input name="dateOfBirth" type="date" required className={inputClass} />
            </Field>
            <Field label="Phone number" hint="Liberian numbers can start with 0, e.g. 0778 123 456" error={e.phone}>
              <input name="phone" type="tel" inputMode="tel" required className={inputClass} />
            </Field>
            <Field label="Backup contact (optional)" hint="Used only to confirm identity if they lose their phone" error={e.backupContact}>
              <input name="backupContact" maxLength={120} className={inputClass} />
            </Field>
          </div>
        </Panel>
        <Panel title="Profile (what other members will see)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Display name" hint="First name or nickname" error={e.displayName}>
              <input name="displayName" required maxLength={40} className={inputClass} />
            </Field>
            <Field label="City / area" error={e.cityId}>
              <select name="cityId" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Looking for" error={e.lookingFor}>
              <select name="lookingFor" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                <option value="RELATIONSHIP">A relationship</option>
                <option value="FRIENDSHIP">Friendship</option>
                <option value="EITHER">Either</option>
              </select>
            </Field>
            <Field label="Gender (optional)" error={e.gender}>
              <select name="gender" className={inputClass} defaultValue="">
                <option value="">Not given</option>
                <option value="WOMAN">Woman</option>
                <option value="MAN">Man</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Occupation (optional)" error={e.occupation}>
              <input name="occupation" maxLength={60} className={inputClass} />
            </Field>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="showGender" defaultChecked className="size-5" /> Show gender
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="showOccupation" defaultChecked className="size-5" /> Show occupation
              </label>
            </div>
          </div>
          <Field label="About (up to 500 characters)" hint="No phone numbers, links, social handles or prices." error={e.bio}>
            <textarea name="bio" required maxLength={500} rows={4} className={`${inputClass} h-auto py-2`} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 font-semibold">Interests (up to 8)</legend>
            {e.interests && <span className="text-admin-small font-semibold text-danger-800">{e.interests}</span>}
            <div className="flex flex-wrap gap-2">
              {interests.map((i) => (
                <label key={i} className="flex items-center gap-1.5 rounded-full border border-control-border px-3 py-1.5">
                  <input type="checkbox" name="interests" value={i} /> {i}
                </label>
              ))}
            </div>
          </fieldset>
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel title="Before saving">
          <p className="text-text-muted">Read each statement to the member and tick only what they agree to. All four are required.</p>
          {(
            [
              ["consentListed", "Agrees to be listed for other invited members"],
              ["consentPhotos", "Agrees to photo use on their profile"],
              ["consentNumberSharing", "Agrees their number is shown only to connections, in calling hours"],
              ["phoneVerifiedByCall", "I called this number and the member answered"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="flex items-start gap-2">
              <input type="checkbox" name={name} className="mt-0.5 size-5 shrink-0" />
              <span>
                {label}
                {e[name] && <span className="block text-admin-small font-semibold text-danger-800">{e[name]}</span>}
              </span>
            </label>
          ))}
          <p className="text-admin-small text-text-secondary">Photos are added on the member page after saving.</p>
          <PrimaryButton disabled={pending}>{pending ? "Saving…" : "Save and create sign-in link"}</PrimaryButton>
        </Panel>
      </div>
    </form>
  );
}
