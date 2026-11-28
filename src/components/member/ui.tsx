import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Member-app building blocks from the design system: body 17px, nothing under 15px, touch targets
 * 48px or more, one pink (pink-500) button per screen, pink text only in pink-800 (NFR-17).
 */
export function MemberScreen({ children, logo = true }: { children: ReactNode; logo?: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 bg-surface-0 px-5 pt-7 pb-8 text-body">
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- a 6 KB SVG; next/image adds nothing here
        <img src="/brand/privateconnet-logo.svg" alt="PrivateConnet" width={60} height={26} className="h-[26px] w-auto self-start" />
      )}
      {children}
    </main>
  );
}

/** The single pink action on a screen. */
export function PinkButton({ children, disabled, name, value }: { children: ReactNode; disabled?: boolean; name?: string; value?: string }) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled}
      className="h-button w-full rounded-lg bg-pink-500 text-body font-bold text-ink disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, disabled, name, value }: { children: ReactNode; disabled?: boolean; name?: string; value?: string }) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={disabled}
      className="h-button w-full rounded-lg border border-control-border bg-surface-0 text-body font-semibold text-ink disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-touch items-center font-semibold text-pink-800 underline underline-offset-4">
      {children}
    </Link>
  );
}

export function Callout({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const tones = {
    info: "bg-surface-100 text-text-muted",
    error: "bg-danger-100 text-danger-800",
    success: "bg-success-100 text-success-700",
  } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg p-3.5 text-[16px] leading-[23px] ${tones[tone]}`}>
      {children}
    </div>
  );
}

export const fieldClass =
  "h-field w-full rounded-md border border-control-border bg-surface-0 px-3 text-body text-ink focus-visible:outline-2";

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-50 py-3">
      <span className="text-text-secondary">{label}</span>
      <span className="text-right font-semibold">{children}</span>
    </div>
  );
}

/** Bottom tabs (NFR-17: icon above label). Discover, Connections and Meetings arrive in M4 and M5. */
export function MemberTabs({ active }: { active: "home" | "profile" | "settings" }) {
  const tabs = [
    { key: "home", href: "/home", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
    { key: "profile", href: "/profile", label: "Profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0" },
    { key: "settings", href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2m12 0h2M12 4v2m0 12v2" },
  ] as const;
  return (
    <nav aria-label="Main" className="sticky bottom-0 mt-auto -mx-5 grid h-nav grid-cols-3 border-t border-line-100 bg-surface-0">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-1 text-small ${active === t.key ? "font-bold text-pink-800" : "text-text-secondary"}`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={t.icon} />
          </svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
