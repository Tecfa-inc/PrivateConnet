import { env } from "@/lib/env";
import { blindIndex, decryptField, encryptField } from "./field-encryption";

/** The encrypted columns of MemberPrivate. Each ciphertext is bound to its member and column. */
export type PrivateField = "legalName" | "dateOfBirth" | "phone" | "backupContact";

const context = (memberId: string, field: PrivateField) => `MemberPrivate.${field}:${memberId}`;

export function sealPrivate(memberId: string, field: PrivateField, value: string): string {
  return encryptField(value, env().FIELD_ENCRYPTION_KEY, context(memberId, field));
}

export function openPrivate(memberId: string, field: PrivateField, ciphertext: string): string {
  return decryptField(ciphertext, env().FIELD_ENCRYPTION_KEY, context(memberId, field));
}

/** Unique, searchable stand-in for an E.164 phone number. */
export function phoneHash(e164: string): string {
  return blindIndex(e164, env().BLIND_INDEX_KEY);
}
