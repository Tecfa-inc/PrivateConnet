"use client";

import { useActionState } from "react";
import { reviewDecisionAction, type FormState } from "../actions";
import { inputClass, Notice } from "@/components/admin/ui";

/** Approve, or reject with a reason that is sent to the member (ADM-05). */
export function DecisionForm({ kind, id, suggestedReason }: { kind: "photo" | "revision"; id: string; suggestedReason?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(reviewDecisionAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <label className="flex flex-col gap-1.5 font-semibold">
        Reason for the member (required to reject)
        <input name="reason" maxLength={300} defaultValue={suggestedReason} className={inputClass} />
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          name="decision"
          value="REJECT"
          disabled={pending}
          className="h-11 rounded-md border border-control-border bg-surface-0 px-4 font-semibold disabled:opacity-60"
        >
          Reject with reason
        </button>
        <button
          type="submit"
          name="decision"
          value="APPROVE"
          disabled={pending}
          className="h-11 rounded-md bg-pink-500 px-5 font-bold text-ink disabled:opacity-60"
        >
          {suggestedReason ? "Approve anyway" : "Approve"}
        </button>
      </div>
    </form>
  );
}
