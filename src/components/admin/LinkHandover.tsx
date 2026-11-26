"use client";

import { useState } from "react";
import { Notice, Panel } from "./ui";

/**
 * Shows a new sign-in link exactly once (ONB-06). The token is not stored, so it cannot be shown again;
 * staff hand it over in person, by WhatsApp or by email, never by SMS (CLAUDE.md rule 2).
 */
export function LinkHandover({ url, expiresAt, heading }: { url: string; expiresAt: string; heading: string }) {
  const [copied, setCopied] = useState(false);
  const expires = new Intl.DateTimeFormat("en-LR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Monrovia" }).format(
    new Date(expiresAt),
  );
  return (
    <Panel title={heading}>
      <Notice tone="success">This link is shown only once. Copy it now and give it to the member.</Notice>
      <code className="block break-all rounded-lg bg-surface-100 p-3 font-mono text-[15px]">{url}</code>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          }}
          className="h-11 rounded-md bg-ink px-4 font-bold text-white"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
        <span className="text-text-secondary">Works once. Expires {expires}.</span>
      </div>
      <p className="text-text-muted">
        The member opens the link, enters their date of birth, then checks and confirms their profile. It is not shown to
        anyone until they confirm.
      </p>
    </Panel>
  );
}
