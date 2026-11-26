import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { ageOn } from "@/lib/age";
import { toE164 } from "@/lib/phone";
import { phoneHash, sealPrivate } from "@/lib/crypto/private-fields";
import { assertCan, type Role } from "@/lib/auth/permissions";
import { issueLinkInTx, type IssuedLink } from "@/features/admin/links/links";
import { createMemberInput } from "./schemas";

/** Wording version recorded with the consents an admin takes at onboarding (PRV-03). */
export const ONBOARDING_CONSENT_VERSION = "2026-11-26";

export class DuplicatePhoneError extends Error {
  constructor() {
    super("This phone number already belongs to a member");
    this.name = "DuplicatePhoneError";
  }
}

/**
 * Creates a member exactly as the PRD describes (ONB-01 to ONB-05, ONB-14, US-01):
 * public profile + encrypted private record + recorded consents + one sign-in link + audit rows,
 * all in one transaction. The profile stays AWAITING_CONFIRMATION until the member confirms it.
 */
export async function createMember(
  staff: { id: string; role: Role },
  rawInput: unknown,
  now: Date = new Date(),
): Promise<{ memberId: string; link: IssuedLink }> {
  assertCan(staff.role, "members.create");
  const input = createMemberInput(now).parse(rawInput);
  const phone = toE164(input.phone)!; // validated by the schema
  const hash = phoneHash(phone);

  const city = await db.city.findUnique({ where: { id: input.cityId }, include: { country: true } });
  if (!city || !city.active || !city.country.active) throw new Error("Choose an active city");

  if (await db.memberPrivate.findUnique({ where: { phoneHash: hash }, select: { memberId: true } })) {
    throw new DuplicatePhoneError();
  }

  const memberId = randomUUID();
  return db.$transaction(async (tx) => {
    await tx.member.create({
      data: {
        id: memberId,
        displayName: input.displayName,
        ageYears: ageOn(input.dateOfBirth, now, city.timeZone),
        cityId: city.id,
        lookingFor: input.lookingFor,
        gender: input.gender,
        occupation: input.occupation,
        bio: input.bio,
        interests: [...input.interests],
        showGender: input.showGender,
        showOccupation: input.showOccupation,
        createdById: staff.id,
      },
    });
    await tx.memberPrivate.create({
      data: {
        memberId,
        legalNameEnc: sealPrivate(memberId, "legalName", input.legalName),
        dateOfBirthEnc: sealPrivate(memberId, "dateOfBirth", input.dateOfBirth),
        phoneEnc: sealPrivate(memberId, "phone", phone),
        phoneHash: hash,
        backupContactEnc: input.backupContact ? sealPrivate(memberId, "backupContact", input.backupContact) : null,
        phoneVerifiedAt: now,
        phoneVerifiedById: staff.id,
      },
    });
    await tx.consent.createMany({
      data: (["LISTED_FOR_MEMBERS", "PHOTO_USE", "NUMBER_SHARING"] as const).map((purpose) => ({
        memberId,
        purpose,
        given: true,
        version: ONBOARDING_CONSENT_VERSION,
        recordedById: staff.id,
      })),
    });
    await writeAudit(
      {
        staffId: staff.id,
        action: "MEMBER_CREATED",
        targetType: "Member",
        targetId: memberId,
        // Record which fields were set, never their private values.
        newValue: { cityId: city.id, phoneVerifiedByCall: true, backupContact: Boolean(input.backupContact) },
      },
      tx,
    );
    const link = await issueLinkInTx(tx, { memberId, purpose: "FIRST_SIGN_IN", staffId: staff.id, now });
    return { memberId, link };
  });
}
