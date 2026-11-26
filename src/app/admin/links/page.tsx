import { requireStaff } from "@/lib/auth/staff-guard";
import { db } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";
import { linkStatus, type LinkStatus } from "@/features/admin/links/links";
import { revokeLinkAction } from "../actions";
import { ReissueForm } from "./ReissueForm";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<LinkStatus, string> = {
  UNUSED: "bg-warning-100 text-warning-800",
  USED: "bg-success-100 text-success-700",
  EXPIRED: "bg-surface-100 text-text-secondary",
  REVOKED: "bg-danger-100 text-danger-800",
};
const STATUS_LABEL: Record<LinkStatus, string> = { UNUSED: "Not used yet", USED: "Used", EXPIRED: "Expired", REVOKED: "Revoked" };

/** Sign-in links (ADM-04). Shows status only; the link itself is never stored or shown again. */
export default async function LinksPage() {
  const staff = await requireStaff("members.create");
  const now = new Date();
  const links = await db.signInLink.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      purpose: true,
      createdAt: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      member: { select: { id: true, memberNumber: true, displayName: true } },
      issuedBy: { select: { name: true } },
    },
  });
  const fmt = new Intl.DateTimeFormat("en-LR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Monrovia" });

  return (
    <AdminShell staff={staff} active="/admin/links">
      <h1 className="text-[28px] font-bold tracking-tight">Sign-in links</h1>
      <div className="overflow-x-auto rounded-xl bg-surface-0">
        <table className="w-full text-left">
          <thead className="border-b border-line-100 text-admin-small uppercase tracking-wider text-text-secondary">
            <tr>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => {
              const status = linkStatus(l, now);
              return (
                <tr key={l.id} className="border-b border-line-50 align-middle">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{l.member.displayName}</div>
                    <div className="text-admin-small text-text-secondary">#{l.member.memberNumber}</div>
                  </td>
                  <td className="px-4 py-3">
                    {fmt.format(l.createdAt)}
                    <div className="text-admin-small text-text-secondary">by {l.issuedBy.name}</div>
                  </td>
                  <td className="px-4 py-3">{fmt.format(l.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-admin-small font-semibold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {status === "UNUSED" ? (
                      <form action={revokeLinkAction}>
                        <input type="hidden" name="linkId" value={l.id} />
                        <button className="h-11 rounded-md border border-control-border px-4 font-semibold">Revoke</button>
                      </form>
                    ) : (
                      <ReissueForm memberId={l.member.id} />
                    )}
                  </td>
                </tr>
              );
            })}
            {links.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-secondary">
                  No sign-in links yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
