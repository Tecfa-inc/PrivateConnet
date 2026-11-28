/**
 * M3 journey against a real PostgreSQL (see CI): link sign-in with date of birth, lockout, single use,
 * 90-day device session, profile confirmation, edits and photos through the review queue, PIN and
 * sign-out everywhere. Covers ONB-05 to ONB-12, PRO-01 to PRO-06, ADM-05, US-02, US-03 and
 * CLAUDE.md rules 3, 4, 7 and 8.
 */
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken } from "@/lib/crypto/tokens";
import { deviceSessionDecision } from "@/lib/auth/member-session";
import { createMember } from "@/features/admin/members/create-member";
import { lookUpLink, redeemLink, signOutAllDevices } from "@/features/member/sign-in";
import { checkDevicePin, confirmProfile, setDevicePin, submitProfileEdit } from "@/features/member/profile";
import { addPhoto, removePhoto } from "@/features/member/photos";
import { decidePhoto, decideRevision, AlreadyDecidedError } from "@/features/admin/review/review";

let admin: { id: string; role: "ADMIN" };
let moderator: { id: string; role: "MODERATOR" };
let cityId: string;

const DOB = "1997-03-14";
const minutes = (n: number, from = new Date()) => new Date(from.getTime() + n * 60_000);

async function newMember() {
  const { memberId, link } = await createMember(admin, {
    legalName: "Korto Johnson",
    displayName: "Korto",
    dateOfBirth: DOB,
    phone: `0886 ${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
    cityId,
    lookingFor: "RELATIONSHIP",
    occupation: "Nurse",
    bio: "Weekends at the beach, Sunday jollof.",
    interests: ["Beach", "Cooking"],
    consentListed: true,
    consentPhotos: true,
    consentNumberSharing: true,
    phoneVerifiedByCall: true,
  });
  return { memberId, token: link.url.split("/s/")[1]! };
}

const testPhoto = (w = 1200, h = 1500) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 180, g: 90, b: 140 } } })
    .jpeg()
    .withExif({ IFD0: { Make: "TestCam" } })
    .toBuffer();

beforeAll(async () => {
  const a = await db.staff.create({
    data: { name: "M3 Admin", email: `m3-admin-${randomUUID()}@test.local`, role: "ADMIN", emailVerified: true, twoFactorEnabled: true },
  });
  const m = await db.staff.create({
    data: { name: "M3 Moderator", email: `m3-mod-${randomUUID()}@test.local`, role: "MODERATOR", emailVerified: true, twoFactorEnabled: true },
  });
  admin = { id: a.id, role: "ADMIN" };
  moderator = { id: m.id, role: "MODERATOR" };
  cityId = (await db.city.findFirstOrThrow({ where: { active: true } })).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("link sign-in (ONB-05, ONB-06, ONB-08, ONB-12, US-02)", () => {
  it("shows only the display name before sign-in", async () => {
    const { token } = await newMember();
    const link = await lookUpLink(token);
    expect(link.state).toBe("valid");
    expect(JSON.stringify(link)).not.toContain("Korto Johnson"); // legal name never reaches the page (rule 7)
    expect(JSON.stringify(link)).not.toContain(DOB);
  });

  it("locks the link for 15 minutes after five wrong dates, then works with the right one", async () => {
    const { memberId, token } = await newMember();
    const now = new Date();
    for (let i = 1; i <= 4; i++) {
      expect(await redeemLink({ token, dateOfBirth: "1990-01-01", now })).toEqual({ ok: false, reason: "wrong-date", triesLeft: 5 - i });
    }
    expect(await redeemLink({ token, dateOfBirth: "1990-01-01", now })).toMatchObject({ ok: false, reason: "locked" });
    // Even the right date is refused while locked.
    expect(await redeemLink({ token, dateOfBirth: DOB, now: minutes(5, now) })).toMatchObject({ ok: false, reason: "locked" });

    const ok = await redeemLink({ token, dateOfBirth: DOB, userAgent: "test-phone", now: minutes(16, now) });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.needsConfirmation).toBe(true);

    const device = await db.memberDevice.findUniqueOrThrow({ where: { id: ok.deviceId } });
    expect(device.memberId).toBe(memberId);
    expect(device.sessionHash).toBe(hashToken(ok.sessionToken)); // only the hash is stored
    const days = (device.expiresAt.getTime() - device.lastSeenAt.getTime()) / 86_400_000;
    expect(days).toBeCloseTo(90, 5);
    expect(deviceSessionDecision(device, minutes(16, now))).toBe("ok");
  });

  it("works once only", async () => {
    const { token } = await newMember();
    expect((await redeemLink({ token, dateOfBirth: DOB })).ok).toBe(true);
    expect(await redeemLink({ token, dateOfBirth: DOB })).toEqual({ ok: false, reason: "used" });
    expect((await lookUpLink(token)).state).toBe("used");
  });

  it("refuses an expired link", async () => {
    const { token } = await newMember();
    expect(await redeemLink({ token, dateOfBirth: DOB, now: minutes(73 * 60) })).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses links of suspended members", async () => {
    const { memberId, token } = await newMember();
    await db.member.update({ where: { id: memberId }, data: { status: "SUSPENDED" } });
    expect(await redeemLink({ token, dateOfBirth: DOB })).toMatchObject({ ok: false, reason: "revoked" });
  });
});

describe("profile confirmation (ONB-07, US-03, rule 3)", () => {
  it("stays hidden until the member accepts the terms, then goes live with a recorded consent", async () => {
    const { memberId } = await newMember();
    await expect(confirmProfile(memberId, false)).rejects.toThrow();
    expect((await db.member.findUniqueOrThrow({ where: { id: memberId } })).status).toBe("AWAITING_CONFIRMATION");

    expect(await confirmProfile(memberId, true)).toBe(true);
    const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(member.status).toBe("ACTIVE");
    expect(member.confirmedAt).not.toBeNull();
    const consent = await db.consent.findFirstOrThrow({ where: { memberId, purpose: "TERMS_AND_PRIVACY" } });
    expect(consent.given).toBe(true);
    expect(consent.recordedById).toBeNull(); // given by the member, not staff (PRV-03)

    expect(await confirmProfile(memberId, true)).toBe(false); // idempotent
    expect(await db.consent.count({ where: { memberId, purpose: "TERMS_AND_PRIVACY" } })).toBe(1);
  });
});

describe("profile edits through the review queue (PRO-03, PRO-06, ADM-05)", () => {
  it("keeps the approved version live, flags contact details, and needs a reason to reject", async () => {
    const { memberId } = await newMember();
    await confirmProfile(memberId, true);
    const edit = {
      displayName: "Korto",
      bio: "Call me on 0886 555 1234",
      occupation: "Nurse",
      interests: ["Beach", "Cooking"],
      lookingFor: "RELATIONSHIP",
      gender: "",
    };
    expect(await submitProfileEdit(memberId, edit)).toEqual({ status: "submitted", flags: ["PHONE_NUMBER"] });
    expect((await db.member.findUniqueOrThrow({ where: { id: memberId } })).bio).toBe("Weekends at the beach, Sunday jollof.");

    // A second submission replaces the pending one instead of piling up.
    await submitProfileEdit(memberId, { ...edit, bio: "Long talks about books." });
    const pending = await db.profileRevision.findMany({ where: { memberId, status: "PENDING" } });
    expect(pending).toHaveLength(1);
    const revisionId = pending[0]!.id;
    expect(pending[0]!.flags).toEqual([]);

    await expect(decideRevision(moderator, { id: revisionId, decision: "REJECT" })).rejects.toThrow();
    await decideRevision(moderator, { id: revisionId, decision: "APPROVE" });
    await expect(decideRevision(moderator, { id: revisionId, decision: "APPROVE" })).rejects.toBeInstanceOf(AlreadyDecidedError);

    const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(member.bio).toBe("Long talks about books.");
    expect(member.status).toBe("ACTIVE"); // an edit never changes status
    expect(await db.auditLog.count({ where: { targetId: revisionId, action: "REVIEW_DECIDED", staffId: moderator.id } })).toBe(1);
    expect(await db.notification.count({ where: { memberId, type: "PROFILE_EDIT_REVIEWED" } })).toBe(1);
  });

  it("sends the rejection reason to the member and leaves the profile unchanged", async () => {
    const { memberId } = await newMember();
    await submitProfileEdit(memberId, {
      displayName: "Korto",
      bio: "USD 50 per night",
      interests: [],
      lookingFor: "RELATIONSHIP",
    });
    const rev = await db.profileRevision.findFirstOrThrow({ where: { memberId, status: "PENDING" } });
    expect(rev.flags).toContain("PRICE");
    await decideRevision(admin, { id: rev.id, decision: "REJECT", reason: "Prices aren't allowed on PrivateConnet." });
    const note = await db.notification.findFirstOrThrow({ where: { memberId, type: "PROFILE_EDIT_REVIEWED" } });
    expect(note.data).toMatchObject({ decision: "REJECTED", reason: "Prices aren't allowed on PrivateConnet." });
    expect((await db.member.findUniqueOrThrow({ where: { id: memberId } })).bio).toBe("Weekends at the beach, Sunday jollof.");
  });
});

describe("photos (PRO-01, PRO-04, NFR-07)", () => {
  it("stores processed photos privately as Pending, removes rejected files, and caps at six", async () => {
    const { memberId } = await newMember();
    const { photoId } = await addPhoto(memberId, await testPhoto());
    const photo = await db.photo.findUniqueOrThrow({ where: { id: photoId } });
    expect(photo.status).toBe("PENDING");
    const dir = path.join(env().MEDIA_ROOT, photo.storageKey);
    for (const size of ["list", "profile", "review"]) expect(existsSync(path.join(dir, `${size}.webp`))).toBe(true);
    const stored = await sharp(path.join(dir, "profile.webp")).metadata();
    expect(stored.exif).toBeUndefined(); // location and camera data removed

    await expect(decidePhoto(moderator, { id: photoId, decision: "REJECT" })).rejects.toThrow(); // reason required
    await decidePhoto(moderator, { id: photoId, decision: "REJECT", reason: "Please use a photo of yourself." });
    expect(existsSync(dir)).toBe(false);
    expect(await db.auditLog.count({ where: { targetId: photoId, action: "REVIEW_DECIDED" } })).toBe(1);

    for (let i = 0; i < 6; i++) await addPhoto(memberId, await testPhoto(800, 1000));
    await expect(addPhoto(memberId, await testPhoto(800, 1000))).rejects.toMatchObject({ code: "too-many" });

    // Members can only remove their own photos.
    const { memberId: other } = await newMember();
    const mine = await db.photo.findFirstOrThrow({ where: { memberId, status: "PENDING" } });
    expect(await removePhoto(other, mine.id)).toBe(false);
    expect(await removePhoto(memberId, mine.id)).toBe(true);
  });
});

describe("PIN and devices (ONB-10, ONB-11, ONB-12)", () => {
  it("locks the device after five wrong PINs and signs out everywhere", async () => {
    const { memberId, token } = await newMember();
    const first = await redeemLink({ token, dateOfBirth: DOB });
    if (!first.ok) throw new Error("sign-in failed");
    await setDevicePin(first.deviceId, { pin: "4821", confirm: "4821" });

    const now = new Date();
    expect(await checkDevicePin(first.deviceId, "4821", now)).toEqual({ ok: true });
    for (let i = 0; i < 4; i++) expect(await checkDevicePin(first.deviceId, "0000", now)).toMatchObject({ ok: false, reason: "wrong" });
    expect(await checkDevicePin(first.deviceId, "0000", now)).toMatchObject({ ok: false, reason: "locked" });
    expect(await checkDevicePin(first.deviceId, "4821", minutes(1, now))).toMatchObject({ ok: false, reason: "locked" });
    expect(await checkDevicePin(first.deviceId, "4821", minutes(16, now))).toEqual({ ok: true });

    expect(await signOutAllDevices(memberId)).toBe(1);
    const device = await db.memberDevice.findUniqueOrThrow({ where: { id: first.deviceId } });
    expect(deviceSessionDecision(device)).toBe("revoked");
  });
});
