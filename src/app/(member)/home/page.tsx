import { requireMember } from "@/lib/auth/member-session";
import { db } from "@/lib/db";
import { Callout, MemberScreen, MemberTabs, TextLink } from "@/components/member/ui";

export const dynamic = "force-dynamic";

const NOTICE_TEXT: Record<string, (d: { decision?: string; reason?: string | null }) => string> = {
  PHOTO_REVIEWED: (d) =>
    d.decision === "APPROVED" ? "Your new photo was approved." : `Your new photo wasn't approved. ${d.reason ?? ""}`.trim(),
  PROFILE_EDIT_REVIEWED: (d) =>
    d.decision === "APPROVED" ? "Your profile changes were approved." : `Your profile changes weren't approved. ${d.reason ?? ""}`.trim(),
};

/**
 * Member home. Discover, Connections and Meetings arrive in milestones M4 and M5; until then this shows
 * the member's profile state and review outcomes (ADM-05: the reason is sent to the member).
 */
export default async function HomePage() {
  const member = await requireMember();
  const [notices, pendingReviews] = await Promise.all([
    db.notification.findMany({
      where: { memberId: member.memberId, readAt: null, type: { in: Object.keys(NOTICE_TEXT) } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, data: true },
    }),
    db.photo.count({ where: { memberId: member.memberId, status: "PENDING" } }),
  ]);
  if (notices.length) {
    await db.notification.updateMany({ where: { id: { in: notices.map((n) => n.id) } }, data: { readAt: new Date() } });
  }

  return (
    <MemberScreen>
      <h1 className="text-title-1 font-bold tracking-tight">Hello, {member.displayName}</h1>
      <Callout tone="success">Your profile is live for other invited members.</Callout>
      {notices.map((n) => (
        <Callout key={n.id} tone={(n.data as { decision?: string })?.decision === "REJECTED" ? "error" : "info"}>
          {NOTICE_TEXT[n.type]?.((n.data ?? {}) as { decision?: string; reason?: string | null })}
        </Callout>
      ))}
      {pendingReviews > 0 && (
        <p className="text-text-muted">
          {pendingReviews} {pendingReviews === 1 ? "photo is" : "photos are"} waiting for review.
        </p>
      )}
      <p className="text-text-muted">
        Browsing members, connecting and calling are coming soon. You&apos;ll find them here.
      </p>
      <TextLink href="/profile">View your profile</TextLink>
      <MemberTabs active="home" />
    </MemberScreen>
  );
}
