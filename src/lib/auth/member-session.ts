import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { hashToken, newToken } from "@/lib/crypto/tokens";
import { sign, verifySignature } from "@/lib/crypto/signing";
import { assertCan, type Capability } from "./permissions";

/**
 * Member device sessions (ONB-06, ONB-08, ONB-10, ONB-11, CLAUDE.md rule 4).
 * Members have no password: a redeemed link creates a MemberDevice whose session token is stored only
 * as a hash. The session lasts 90 days after the last visit; the database row is the source of truth,
 * the cookie only carries the token. A cookie separate from the staff one (pc_admin_*), so neither
 * session can be used on the other site.
 */
export const MEMBER_COOKIE = "pc_member";
export const PIN_UNLOCK_COOKIE = "pc_member_unlock";

const DAY_MS = 86_400_000;
/** Roll the 90-day window forward at most once an hour, to keep page loads write-free most of the time. */
const ROLL_EVERY_MS = 3_600_000;
/** The PIN is asked again when the app is reopened, and at least every 12 hours. */
const PIN_UNLOCK_HOURS = 12;

const secureCookies = () => env().APP_ORIGIN.startsWith("https://");

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/** Creates a device session and returns its token. The token is never stored. */
export async function createDeviceSession(
  tx: Tx,
  args: { memberId: string; userAgent?: string | null; now?: Date },
): Promise<{ token: string; deviceId: string }> {
  const now = args.now ?? new Date();
  const token = newToken();
  const device = await tx.memberDevice.create({
    data: {
      memberId: args.memberId,
      sessionHash: hashToken(token),
      userAgent: args.userAgent?.slice(0, 200) ?? null,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + DEFAULT_SETTINGS.sessionIdleDays * DAY_MS),
    },
  });
  return { token, deviceId: device.id };
}

export type SessionDecision = "ok" | "expired" | "revoked";

/** Pure decision, unit-tested: is a stored device session still usable at `now`? */
export function deviceSessionDecision(device: { revokedAt: Date | null; expiresAt: Date }, now: Date = new Date()): SessionDecision {
  if (device.revokedAt) return "revoked";
  if (device.expiresAt.getTime() <= now.getTime()) return "expired";
  return "ok";
}

export function shouldRollSession(lastSeenAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - lastSeenAt.getTime() >= ROLL_EVERY_MS;
}

// ─── PIN unlock marker (ONB-10) ───

/** Value of the unlock cookie: device id, expiry (seconds) and a signature over both. */
export function pinUnlockValue(deviceId: string, now: Date = new Date(), key?: string): string {
  const exp = Math.floor(now.getTime() / 1000) + PIN_UNLOCK_HOURS * 3600;
  return `${deviceId}.${exp}.${sign("pin-unlock", `${deviceId}:${exp}`, key)}`;
}

export function pinUnlockIsValid(value: string | undefined, deviceId: string, now: Date = new Date(), key?: string): boolean {
  if (!value) return false;
  const [id, expText, sig] = value.split(".");
  if (id !== deviceId || !expText || !sig) return false;
  const exp = Number(expText);
  if (!Number.isInteger(exp) || exp < Math.floor(now.getTime() / 1000)) return false;
  return verifySignature("pin-unlock", `${deviceId}:${exp}`, sig, key);
}

// ─── Cookies (only callable from server actions and route handlers) ───

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    // The 90-day rolling limit is enforced by MemberDevice.expiresAt; the cookie simply outlives it.
    maxAge: 400 * 24 * 3600,
  });
}

export async function setPinUnlockCookie(deviceId: string): Promise<void> {
  // No maxAge: a browser-session cookie, so closing the app asks for the PIN again.
  (await cookies()).set(PIN_UNLOCK_COOKIE, pinUnlockValue(deviceId), {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
  });
}

export async function clearMemberCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
  jar.delete(PIN_UNLOCK_COOKIE);
}

// ─── Reading the session ───

export type MemberContext = {
  deviceId: string;
  memberId: string;
  displayName: string;
  status: "AWAITING_CONFIRMATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  confirmed: boolean;
  hasPin: boolean;
  pinUnlocked: boolean;
};

/** The signed-in member on this device, or null. Never selects MemberPrivate (rule 7). */
export async function getMemberContext(now: Date = new Date()): Promise<MemberContext | null> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const device = await db.memberDevice.findUnique({
    where: { sessionHash: hashToken(token) },
    select: {
      id: true,
      revokedAt: true,
      expiresAt: true,
      lastSeenAt: true,
      pinHash: true,
      member: { select: { id: true, displayName: true, status: true, confirmedAt: true } },
    },
  });
  if (!device || deviceSessionDecision(device, now) !== "ok") return null;

  if (shouldRollSession(device.lastSeenAt, now)) {
    await db.memberDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: now, expiresAt: new Date(now.getTime() + DEFAULT_SETTINGS.sessionIdleDays * DAY_MS) },
    });
  }

  return {
    deviceId: device.id,
    memberId: device.member.id,
    displayName: device.member.displayName,
    status: device.member.status,
    confirmed: device.member.confirmedAt !== null,
    hasPin: device.pinHash !== null,
    pinUnlocked: device.pinHash === null || pinUnlockIsValid(jar.get(PIN_UNLOCK_COOKIE)?.value, device.id, now),
  };
}

/**
 * Call at the top of every member page and member server action. Checks, in order: a valid session,
 * account state, the PIN, then (for `stage: "member"`) that the profile has been confirmed, and finally
 * the role capability. Redirects instead of rendering anything the visitor may not see.
 */
export async function requireMember(
  opts: { stage?: "onboarding" | "member" | "pin"; capability?: Capability } = {},
): Promise<MemberContext> {
  const stage = opts.stage ?? "member";
  const ctx = await getMemberContext();
  if (!ctx || ctx.status === "DEACTIVATED") redirect("/signed-out");
  if (ctx.status === "SUSPENDED") redirect("/paused");
  if (stage !== "pin" && !ctx.pinUnlocked) redirect("/unlock");
  if (stage === "member" && !ctx.confirmed) redirect("/welcome");
  if (opts.capability) assertCan("MEMBER", opts.capability);
  return ctx;
}

/** Route handlers and server actions on the member site accept same-origin requests only. */
export async function assertSameOrigin(): Promise<void> {
  const origin = (await headers()).get("origin");
  if (origin && origin !== new URL(env().APP_ORIGIN).origin) throw new Error("Cross-site request refused");
}
