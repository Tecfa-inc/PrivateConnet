import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { openPrivate } from "@/lib/crypto/private-fields";
import { assertCan, type Role } from "@/lib/auth/permissions";
import { formatPhone } from "@/lib/phone";
import { revealInput } from "./schemas";

/**
 * Shows one private field to an Admin or Super Admin (ADM-16). A reason is required and the
 * reveal is written to the audit log in the same transaction, before the value is returned.
 */
export async function revealPrivateField(staff: { id: string; role: Role }, rawInput: unknown): Promise<string | null> {
  assertCan(staff.role, "members.revealPrivate");
  const { memberId, field, reason } = revealInput.parse(rawInput);

  return db.$transaction(async (tx) => {
    const record = await tx.memberPrivate.findUnique({ where: { memberId } });
    if (!record) throw new Error("Member not found");
    await writeAudit(
      { staffId: staff.id, action: "PRIVATE_FIELD_REVEALED", targetType: "Member", targetId: memberId, reason, newValue: { field } },
      tx,
    );
    const ciphertext = {
      legalName: record.legalNameEnc,
      dateOfBirth: record.dateOfBirthEnc,
      phone: record.phoneEnc,
      backupContact: record.backupContactEnc,
    }[field];
    if (!ciphertext) return null;
    const value = openPrivate(memberId, field, ciphertext);
    return field === "phone" ? formatPhone(value) : value;
  });
}
