"use client";

import { useActionState } from "react";
import { reissueLinkAction, type FormState } from "../actions";
import { LinkHandover } from "@/components/admin/LinkHandover";
import { DarkButton, Notice } from "@/components/admin/ui";

/** ONB-09 / ONB-14: a new link only after staff confirm identity by one of the approved routes. */
export function ReissueForm({ memberId }: { memberId: string }) {
  const [state, action] = useActionState<FormState, FormData>(reissueLinkAction, {});
  const created = state.created as { url: string; expiresAt: string } | undefined;
  if (created) return <LinkHandover {...created} heading="New sign-in link" />;
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <select name="identityCheck" required defaultValue="" aria-label="How identity was confirmed" className="h-11 rounded-md border border-control-border px-2">
        <option value="" disabled>
          Identity confirmed by…
        </option>
        <option value="CALLED_REGISTERED_NUMBER">Calling their registered number</option>
        <option value="BACKUP_CONTACT">Their backup contact</option>
        <option value="IN_PERSON">In person</option>
      </select>
      <DarkButton>New link</DarkButton>
      {state.error && <Notice tone="error">{state.error}</Notice>}
    </form>
  );
}
