import type { ReactNode } from "react";

/** Small admin building blocks following the design system (admin text 14px, controls 44px). */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-admin-body font-semibold text-ink">
      {label}
      {children}
      {hint && <span className="text-admin-small font-normal text-text-secondary">{hint}</span>}
      {error && <span className="text-admin-small font-semibold text-danger-800">{error}</span>}
    </label>
  );
}

export const inputClass =
  "h-11 rounded-md border border-control-border bg-surface-0 px-3 text-[15px] font-normal text-ink focus-visible:outline-2";

export function PrimaryButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="h-11 rounded-md bg-pink-500 px-5 text-[15px] font-bold text-ink disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function DarkButton({ children }: { children: ReactNode }) {
  return (
    <button type="submit" className="h-11 rounded-md bg-ink px-4 text-[14px] font-bold text-white">
      {children}
    </button>
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface-0 p-5">
      {title && <h2 className="text-[16px] font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "bg-pink-100 text-ink",
    error: "bg-danger-100 text-danger-800",
    success: "bg-success-100 text-success-700",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg p-3 text-admin-body ${tones[tone]}`}>
      {children}
    </div>
  );
}
