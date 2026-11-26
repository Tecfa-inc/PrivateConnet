import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/audit";
import { hashToken, newToken } from "@/lib/crypto/tokens";
import { DEFAULT_SETTINGS } from "@/lib/settings";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export type IssuedLink = { linkId: string; url: string; expiresAt: Date };

/** Public address of a sign-in link. The token appears only here, once (ONB-05). */
export const linkUrl = (token: string) => `${env().APP_ORIGIN}/s/${token}`;

/**
 * Issues a single-use sign-in link and revokes any unused one for the same member,
 * so only one link is ever live (ONB-05, ONB-09). Must run inside a transaction.
 */
export async function issueLinkInTx(
  tx: Tx,
  args: { memberId: string; purpose: "FIRST_SIGN_IN" | "NEW_DEVICE"; staffId: string; reason?: string; now?: Date },
): Promise<IssuedLink> {
  const now = args.now ?? new Date();
  const revoked = await tx.signInLink.updateMany({
    where: { memberId: args.memberId, usedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });
  const token = newToken();
  const expiresAt = new Date(now.getTime() + DEFAULT_SETTINGS.signInLinkHours * 3_600_000);
  const link = await tx.signInLink.create({
    data: {
      memberId: args.memberId,
      tokenHash: hashToken(token),
      purpose: args.purpose,
      issuedById: args.staffId,
      expiresAt,
    },
  });
  await writeAudit(
    {
      staffId: args.staffId,
      action: "SIGN_IN_LINK_CREATED",
      targetType: "Member",
      targetId: args.memberId,
      reason: args.reason,
      newValue: { linkId: link.id, purpose: args.purpose, expiresAt: expiresAt.toISOString(), revokedPrevious: revoked.count },
    },
    tx,
  );
  return { linkId: link.id, url: linkUrl(token), expiresAt };
}

/** Reissue for a new phone or an expired link. Staff must first confirm identity by calling (ONB-09, ONB-14). */
export async function reissueLink(args: {
  memberId: string;
  staffId: string;
  identityCheck: "CALLED_REGISTERED_NUMBER" | "BACKUP_CONTACT" | "IN_PERSON";
}): Promise<IssuedLink> {
  return db.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: args.memberId }, select: { status: true } });
    if (!member) throw new Error("Member not found");
    if (member.status === "DEACTIVATED") throw new Error("This account is deactivated");
    return issueLinkInTx(tx, {
      memberId: args.memberId,
      purpose: "NEW_DEVICE",
      staffId: args.staffId,
      reason: `Identity confirmed: ${args.identityCheck}`,
    });
  });
}

export async function revokeLink(args: { linkId: string; staffId: string; reason: string }): Promise<void> {
  await db.$transaction(async (tx) => {
    const link = await tx.signInLink.findUnique({ where: { id: args.linkId } });
    if (!link) throw new Error("Link not found");
    if (link.usedAt || link.revokedAt) return; // nothing to revoke
    await tx.signInLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
    await writeAudit(
      { staffId: args.staffId, action: "SIGN_IN_LINK_REVOKED", targetType: "Member", targetId: link.memberId, reason: args.reason },
      tx,
    );
  });
}

export type LinkStatus = "UNUSED" | "USED" | "EXPIRED" | "REVOKED";

export function linkStatus(link: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()): LinkStatus {
  if (link.usedAt) return "USED";
  if (link.revokedAt) return "REVOKED";
  if (link.expiresAt <= now) return "EXPIRED";
  return "UNUSED";
}
