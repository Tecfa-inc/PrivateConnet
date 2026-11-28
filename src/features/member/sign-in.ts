import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { hashToken, tokensMatch } from "@/lib/crypto/tokens";
import { openPrivate } from "@/lib/crypto/private-fields";
import { createDeviceSession } from "@/lib/auth/member-session";

/**
 * Member sign-in with a single-use link and date of birth (ONB-05, ONB-06, ONB-08, ONB-12, US-02).
 */

export type LinkState = "valid" | "used" | "expired" | "revoked" | "locked" | "invalid";

/** Pure decision, unit-tested. Order matters: a used link stays "used" even after it would have expired. */
export function linkState(
  link: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date; lockedUntil: Date | null } | null,
  now: Date = new Date(),
): LinkState {
  if (!link) return "invalid";
  if (link.usedAt) return "used";
  if (link.revokedAt) return "revoked";
  if (link.expiresAt <= now) return "expired";
  if (link.lockedUntil && link.lockedUntil > now) return "locked";
  return "valid";
}

/** Tokens are 43 base64url characters; anything else is refused before touching the database. */
export const looksLikeToken = (token: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(token);

/** Day, month and year fields to "YYYY-MM-DD", or null if they don't make a real date. */
export function parseDateOfBirth(day: string, month: string, year: string): string | null {
  const d = Number(day.trim());
  const m = Number(month.trim());
  const y = Number(year.trim());
  if (![d, m, y].every(Number.isInteger) || y < 1900 || y > 2100) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** What the link page may show before sign-in: the display name and expiry only. */
export async function lookUpLink(token: string, now: Date = new Date()) {
  if (!looksLikeToken(token)) return { state: "invalid" as LinkState };
  const link = await db.signInLink.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      usedAt: true,
      revokedAt: true,
      expiresAt: true,
      lockedUntil: true,
      member: { select: { displayName: true, status: true } },
    },
  });
  const state = linkState(link, now);
  if (!link) return { state };
  const unavailable = link.member.status === "SUSPENDED" || link.member.status === "DEACTIVATED";
  return {
    state: unavailable && state === "valid" ? ("revoked" as LinkState) : state,
    displayName: link.member.displayName,
    expiresAt: link.expiresAt,
    lockedUntil: link.lockedUntil,
  };
}

export type RedeemResult =
  | { ok: true; sessionToken: string; deviceId: string; needsConfirmation: boolean }
  | { ok: false; reason: Exclude<LinkState, "valid"> | "wrong-date"; triesLeft?: number };

/**
 * Checks the link and the date of birth, then marks the link used and creates a device session,
 * all in one transaction. Five wrong dates lock the link for 15 minutes (ONB-12).
 */
export async function redeemLink(args: {
  token: string;
  dateOfBirth: string | null;
  userAgent?: string | null;
  now?: Date;
}): Promise<RedeemResult> {
  const now = args.now ?? new Date();
  if (!looksLikeToken(args.token)) return { ok: false, reason: "invalid" };
  const max = DEFAULT_SETTINGS.lockAfterFailedTries;

  return db.$transaction(async (tx): Promise<RedeemResult> => {
    const link = await tx.signInLink.findUnique({
      where: { tokenHash: hashToken(args.token) },
      select: {
        id: true,
        memberId: true,
        usedAt: true,
        revokedAt: true,
        expiresAt: true,
        lockedUntil: true,
        failedTries: true,
        member: { select: { status: true, confirmedAt: true } },
      },
    });
    const state = linkState(link, now);
    if (!link || state !== "valid") {
      return { ok: false, reason: (state === "valid" ? "invalid" : state) as Exclude<LinkState, "valid"> };
    }
    if (link.member.status === "SUSPENDED" || link.member.status === "DEACTIVATED") return { ok: false, reason: "revoked" };

    // Read only the encrypted date of birth, in its own query, server-side (rule 7).
    const record = await tx.memberPrivate.findUnique({ where: { memberId: link.memberId }, select: { dateOfBirthEnc: true } });
    const onFile = record ? openPrivate(link.memberId, "dateOfBirth", record.dateOfBirthEnc) : null;

    if (!onFile || !args.dateOfBirth || !tokensMatch(onFile, args.dateOfBirth)) {
      const tries = link.failedTries + 1;
      if (tries >= max) {
        await tx.signInLink.update({
          where: { id: link.id },
          data: { failedTries: 0, lockedUntil: new Date(now.getTime() + DEFAULT_SETTINGS.lockMinutes * 60_000) },
        });
        return { ok: false, reason: "locked", triesLeft: 0 };
      }
      await tx.signInLink.update({ where: { id: link.id }, data: { failedTries: tries } });
      return { ok: false, reason: "wrong-date", triesLeft: max - tries };
    }

    // Single use even under concurrent requests: only one update can match usedAt = null.
    const claimed = await tx.signInLink.updateMany({
      where: { id: link.id, usedAt: null, revokedAt: null },
      data: { usedAt: now, failedTries: 0, lockedUntil: null },
    });
    if (claimed.count !== 1) return { ok: false, reason: "used" };

    const session = await createDeviceSession(tx, { memberId: link.memberId, userAgent: args.userAgent, now });
    return { ok: true, sessionToken: session.token, deviceId: session.deviceId, needsConfirmation: link.member.confirmedAt === null };
  });
}

/** ONB-11: end every device session for a member (from their settings, or by an admin after a lost phone). */
export async function signOutAllDevices(memberId: string, now: Date = new Date()): Promise<number> {
  const result = await db.memberDevice.updateMany({ where: { memberId, revokedAt: null }, data: { revokedAt: now } });
  return result.count;
}
