import { z } from "zod";
import { db } from "@/lib/db";
import { hashPin, verifyPin } from "@/lib/crypto/tokens";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { contactOrPriceFlags, INTERESTS } from "@/features/admin/members/schemas";

/** Version of the terms and privacy notice accepted at first sign-in (ONB-07, PRV-03). */
export const TERMS_VERSION = "2026-11-26";

// ─── Confirm profile (ONB-07, US-03, CLAUDE.md rule 3) ───

/**
 * The member accepts the terms and privacy notice (including hosting outside Liberia) and publishes
 * their profile. Until this runs the profile is AWAITING_CONFIRMATION and never discoverable.
 */
export async function confirmProfile(memberId: string, acceptedTerms: boolean, now: Date = new Date()): Promise<boolean> {
  if (acceptedTerms !== true) throw new Error("Accept the terms and privacy notice to continue");
  return db.$transaction(async (tx) => {
    const updated = await tx.member.updateMany({
      where: { id: memberId, status: "AWAITING_CONFIRMATION", confirmedAt: null },
      data: { status: "ACTIVE", confirmedAt: now },
    });
    if (updated.count !== 1) return false; // already confirmed, or not allowed in this state
    await tx.consent.create({
      data: { memberId, purpose: "TERMS_AND_PRIVACY", given: true, version: TERMS_VERSION, recordedById: null },
    });
    return true;
  });
}

// ─── Profile edits (PRO-01, PRO-03, PRO-06) ───

/** Public fields a member may ask to change. Anything else in a submission is ignored. */
export const EDITABLE_FIELDS = ["displayName", "bio", "occupation", "interests", "lookingFor", "gender"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const profileEditInput = z.object({
  displayName: z.string().trim().min(1, "Enter a display name").max(40),
  bio: z.string().trim().min(1, "Write a few words about yourself").max(500, "Keep it under 500 characters"),
  occupation: z
    .string()
    .trim()
    .max(60)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  interests: z.array(z.enum(INTERESTS)).max(8, "Choose up to 8 interests").default([]),
  lookingFor: z.enum(["RELATIONSHIP", "FRIENDSHIP", "EITHER"]),
  gender: z
    .enum(["WOMAN", "MAN", "OTHER", ""])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});
export type ProfileEdit = z.infer<typeof profileEditInput>;

type LiveProfile = { [K in EditableField]: ProfileEdit[K] };
export type ProfileChanges = Partial<LiveProfile>;

const sameValue = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? a.length === b.length && a.every((x, i) => x === b[i]) : a === b;

/** Only the fields that differ from the live, approved profile. Pure; unit-tested. */
export function diffProfile(live: LiveProfile, proposed: ProfileEdit): ProfileChanges {
  const changes: ProfileChanges = {};
  for (const field of EDITABLE_FIELDS) {
    if (!sameValue(live[field], proposed[field])) (changes as Record<string, unknown>)[field] = proposed[field];
  }
  return changes;
}

/** PRO-06: flags for contact details or prices in free text, shown to the reviewer. */
export function revisionFlags(changes: ProfileChanges): string[] {
  const text = [changes.displayName, changes.bio, changes.occupation].filter(Boolean).join("\n");
  return text ? contactOrPriceFlags(text) : [];
}

/** Parses stored changes back through the whitelist, so only allowed public fields can ever be applied. */
export function sanitizeChanges(raw: unknown): ProfileChanges {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (Object.hasOwn(source, field)) {
      const value = source[field];
      // Stored nulls mean "cleared" for the optional fields.
      out[field] = value === null && (field === "occupation" || field === "gender") ? null : profileEditInput.shape[field].parse(value);
    }
  }
  return out as ProfileChanges;
}

/**
 * Sends an edit to the review queue. The approved profile stays live until a moderator decides (PRO-03).
 * A member has at most one pending edit: a new submission replaces it.
 */
export async function submitProfileEdit(
  memberId: string,
  raw: unknown,
): Promise<{ status: "submitted" | "no-change"; flags: string[] }> {
  const proposed = profileEditInput.parse(raw);
  const live = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { displayName: true, bio: true, occupation: true, interests: true, lookingFor: true, gender: true },
  });
  const changes = diffProfile(live as LiveProfile, proposed);
  const flags = revisionFlags(changes);

  return db.$transaction(async (tx) => {
    const pending = await tx.profileRevision.findFirst({ where: { memberId, status: "PENDING" }, select: { id: true } });
    if (Object.keys(changes).length === 0) {
      // Back to the live version: withdraw any pending edit.
      if (pending) await tx.profileRevision.delete({ where: { id: pending.id } });
      return { status: "no-change" as const, flags: [] };
    }
    if (pending) {
      await tx.profileRevision.update({ where: { id: pending.id }, data: { changes: changes as object, flags, createdAt: new Date() } });
    } else {
      await tx.profileRevision.create({ data: { memberId, changes: changes as object, flags } });
    }
    return { status: "submitted" as const, flags };
  });
}

/** PRO-02: visibility switches only hide or show already-approved fields, so they apply at once. */
export const visibilityInput = z.object({ showGender: z.boolean(), showOccupation: z.boolean() });

export async function setVisibility(memberId: string, raw: unknown): Promise<void> {
  const data = visibilityInput.parse(raw);
  await db.member.update({ where: { id: memberId }, data });
}

// ─── Device PIN (ONB-10, ONB-12) ───

export const pinInput = z
  .object({
    pin: z.string().regex(/^\d{4}$/, "Use exactly 4 digits"),
    confirm: z.string(),
  })
  .refine((v) => v.pin === v.confirm, { path: ["confirm"], message: "The two PINs don't match" })
  .refine((v) => !/^(\d)\1{3}$/.test(v.pin) && !["1234", "4321", "0123", "9876"].includes(v.pin), {
    path: ["pin"],
    message: "Choose a PIN that is harder to guess",
  });

export async function setDevicePin(deviceId: string, raw: unknown): Promise<void> {
  const { pin } = pinInput.parse(raw);
  await db.memberDevice.update({
    where: { id: deviceId },
    data: { pinHash: await hashPin(pin), pinFailedTries: 0, pinLockedUntil: null },
  });
}

export async function removeDevicePin(deviceId: string): Promise<void> {
  await db.memberDevice.update({ where: { id: deviceId }, data: { pinHash: null, pinFailedTries: 0, pinLockedUntil: null } });
}

export type PinCheck = { ok: true } | { ok: false; reason: "locked" | "wrong"; triesLeft: number; lockedUntil?: Date };

/** Checks the PIN for this device. Five wrong tries lock the device for 15 minutes (ONB-12). */
export async function checkDevicePin(deviceId: string, pin: string, now: Date = new Date()): Promise<PinCheck> {
  const max = DEFAULT_SETTINGS.lockAfterFailedTries;
  const device = await db.memberDevice.findUniqueOrThrow({
    where: { id: deviceId },
    select: { pinHash: true, pinFailedTries: true, pinLockedUntil: true },
  });
  if (!device.pinHash) return { ok: true };
  if (device.pinLockedUntil && device.pinLockedUntil > now) {
    return { ok: false, reason: "locked", triesLeft: 0, lockedUntil: device.pinLockedUntil };
  }
  if (/^\d{4}$/.test(pin) && (await verifyPin(pin, device.pinHash))) {
    await db.memberDevice.update({ where: { id: deviceId }, data: { pinFailedTries: 0, pinLockedUntil: null } });
    return { ok: true };
  }
  const tries = device.pinFailedTries + 1;
  if (tries >= max) {
    const lockedUntil = new Date(now.getTime() + DEFAULT_SETTINGS.lockMinutes * 60_000);
    await db.memberDevice.update({ where: { id: deviceId }, data: { pinFailedTries: 0, pinLockedUntil: lockedUntil } });
    return { ok: false, reason: "locked", triesLeft: 0, lockedUntil };
  }
  await db.memberDevice.update({ where: { id: deviceId }, data: { pinFailedTries: tries } });
  return { ok: false, reason: "wrong", triesLeft: max - tries };
}
