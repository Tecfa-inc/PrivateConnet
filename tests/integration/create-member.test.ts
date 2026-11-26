/**
 * Runs against a real PostgreSQL with the migrations applied and seed.sql loaded (see CI).
 * Covers ONB-01 to ONB-06, ONB-09, ADM-04 and CLAUDE.md rules 3, 7 and 8.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto/tokens";
import { openPrivate } from "@/lib/crypto/private-fields";
import { createMember, DuplicatePhoneError } from "@/features/admin/members/create-member";
import { reissueLink, revokeLink } from "@/features/admin/links/links";
import { revealPrivateField } from "@/features/admin/members/reveal";

let admin: { id: string; role: "ADMIN" };
let cityId: string;

const input = (overrides: Record<string, unknown> = {}) => ({
  legalName: "Comfort Wesseh",
  displayName: "Comfort",
  dateOfBirth: "1995-04-12",
  phone: `0778 ${String(Math.floor(Math.random() * 1e6)).padStart(6, "0")}`,
  backupContact: "Sister, Mary",
  cityId,
  lookingFor: "RELATIONSHIP",
  bio: "I enjoy cooking and choir.",
  interests: ["Music"],
  consentListed: true,
  consentPhotos: true,
  consentNumberSharing: true,
  phoneVerifiedByCall: true,
  ...overrides,
});

beforeAll(async () => {
  const staff = await db.staff.create({
    data: { name: "Test Admin", email: `admin-${randomUUID()}@test.local`, role: "ADMIN", emailVerified: true, twoFactorEnabled: true },
  });
  admin = { id: staff.id, role: "ADMIN" };
  const city = await db.city.findFirstOrThrow({ where: { active: true } });
  cityId = city.id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("createMember", () => {
  it("creates the profile, encrypted private record, consents, link and audit rows", async () => {
    const data = input();
    const { memberId, link } = await createMember(admin, data);

    const member = await db.member.findUniqueOrThrow({ where: { id: memberId } });
    expect(member.status).toBe("AWAITING_CONFIRMATION"); // rule 3: not discoverable yet
    expect(member.confirmedAt).toBeNull();
    expect(member.ageYears).toBeGreaterThanOrEqual(18);

    const priv = await db.memberPrivate.findUniqueOrThrow({ where: { memberId } });
    expect(priv.legalNameEnc).not.toContain("Comfort"); // rule 7: encrypted at rest
    expect(priv.phoneEnc).not.toContain("0778");
    expect(openPrivate(memberId, "legalName", priv.legalNameEnc)).toBe("Comfort Wesseh");

    expect(await db.consent.count({ where: { memberId } })).toBe(3);

    const token = link.url.split("/s/")[1]!;
    const stored = await db.signInLink.findUniqueOrThrow({ where: { id: link.linkId } });
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token); // the token itself is never stored

    const actions = (await db.auditLog.findMany({ where: { targetId: memberId } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["MEMBER_CREATED", "SIGN_IN_LINK_CREATED"]));
  });

  it("rejects a phone number that is already registered", async () => {
    const data = input();
    await createMember(admin, data);
    await expect(createMember(admin, { ...data, phone: data.phone.replace(/^0/, "+231 ") })).rejects.toBeInstanceOf(
      DuplicatePhoneError,
    );
  });

  it("rejects anyone under 18 and saves nothing", async () => {
    const before = await db.member.count();
    await expect(createMember(admin, input({ dateOfBirth: "2010-01-01" }))).rejects.toThrow();
    expect(await db.member.count()).toBe(before);
  });

  it("rejects a member without every consent", async () => {
    await expect(createMember(admin, input({ consentNumberSharing: false }))).rejects.toThrow();
  });

  it("refuses moderators", async () => {
    await expect(createMember({ id: admin.id, role: "MODERATOR" } as never, input())).rejects.toThrow();
  });
});

describe("sign-in links", () => {
  it("reissue revokes the previous unused link (ONB-09)", async () => {
    const { memberId, link } = await createMember(admin, input());
    const second = await reissueLink({ memberId, staffId: admin.id, identityCheck: "CALLED_REGISTERED_NUMBER" });
    const first = await db.signInLink.findUniqueOrThrow({ where: { id: link.linkId } });
    expect(first.revokedAt).not.toBeNull();
    expect(second.linkId).not.toBe(link.linkId);
    const audit = await db.auditLog.findFirst({ where: { targetId: memberId, reason: { contains: "Identity confirmed" } } });
    expect(audit).not.toBeNull();
  });

  it("revoke writes an audit row", async () => {
    const { memberId, link } = await createMember(admin, input());
    await revokeLink({ linkId: link.linkId, staffId: admin.id, reason: "test" });
    expect(await db.auditLog.count({ where: { targetId: memberId, action: "SIGN_IN_LINK_REVOKED" } })).toBe(1);
  });
});

describe("private data reveal (rule 8)", () => {
  it("writes the audit row before returning the value", async () => {
    const data = input();
    const { memberId } = await createMember(admin, data);
    const shown = await revealPrivateField(admin, { memberId, field: "legalName", reason: "Identity check by phone" });
    expect(shown).toBe("Comfort Wesseh");
    expect(await db.auditLog.count({ where: { targetId: memberId, action: "PRIVATE_FIELD_REVEALED" } })).toBe(1);
  });
});

describe("AuditLog is insert-only (rule 8)", () => {
  it("blocks UPDATE and DELETE at the database", async () => {
    const row = await db.auditLog.findFirstOrThrow();
    await expect(db.auditLog.update({ where: { id: row.id }, data: { reason: "tampered" } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow();
  });
});
