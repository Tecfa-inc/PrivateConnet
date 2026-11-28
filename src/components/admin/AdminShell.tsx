import Link from "next/link";
import type { ReactNode } from "react";
import type { StaffContext } from "@/lib/auth/staff-guard";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/members/new", label: "Create member" },
  { href: "/admin/links", label: "Sign-in links" },
  { href: "/admin/review", label: "Review queue" },
] as const;

const ROLE_LABEL = { SUPER_ADMIN: "Super Admin", ADMIN: "Admin", MODERATOR: "Moderator" } as const;

/** Admin layout from the approved screens: left sidebar, fluid content. More modules arrive in M6. */
export function AdminShell({ staff, active, children }: { staff: StaffContext; active: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-surface-100 text-admin-body text-ink">
      <aside className="flex w-62 shrink-0 flex-col gap-5 border-r border-line-100 bg-surface-0 px-4 py-6">
        <div className="px-2">
          <div className="text-[20px] font-bold italic tracking-tight">
            Private<span className="text-pink-800">Connet</span>
          </div>
          <div className="text-admin-small font-semibold uppercase tracking-wider text-text-secondary">Admin</div>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active === item.href ? "page" : undefined}
              className={
                active === item.href
                  ? "rounded-md bg-pink-100 px-3 py-2.5 font-semibold text-pink-800"
                  : "rounded-md px-3 py-2.5 text-text-muted hover:bg-surface-100"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line-100 px-2 pt-3">
          <div className="font-semibold">{staff.name}</div>
          <div className="text-admin-small text-text-secondary">{ROLE_LABEL[staff.role as keyof typeof ROLE_LABEL]} · two-step on</div>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-8 py-7">{children}</main>
    </div>
  );
}
