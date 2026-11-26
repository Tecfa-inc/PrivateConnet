import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff-guard";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

/** Overview (ADM-01). Counts only; more panels arrive with later milestones. */
export default async function AdminOverviewPage() {
  const staff = await requireStaff();
  const now = new Date();
  const [active, awaiting, unusedLinks] = await Promise.all([
    db.member.count({ where: { status: "ACTIVE" } }),
    db.member.count({ where: { status: "AWAITING_CONFIRMATION" } }),
    db.signInLink.count({ where: { usedAt: null, revokedAt: null, expiresAt: { gt: now } } }),
  ]);
  const tiles = [
    { label: "Active members", value: active },
    { label: "Awaiting confirmation", value: awaiting },
    { label: "Unused sign-in links", value: unusedLinks },
  ];
  return (
    <AdminShell staff={staff} active="/admin">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-tight">Hello, {staff.name}</h1>
        <div className="flex gap-3">
          {staff.role !== "MODERATOR" && (
            <Link href="/admin/members/new" className="flex h-11 items-center rounded-md bg-pink-500 px-5 font-bold text-ink">
              Create member
            </Link>
          )}
          <form action={signOutAction}>
            <button className="h-11 rounded-md border border-control-border bg-surface-0 px-4 font-semibold">Sign out</button>
          </form>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="flex flex-col gap-1 rounded-xl bg-surface-0 p-4">
            <span className="text-text-secondary">{t.label}</span>
            <span className="text-[30px] font-bold">{t.value}</span>
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
