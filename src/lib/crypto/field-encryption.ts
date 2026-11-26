import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Column encryption for MemberPrivate (CLAUDE.md rule 7).
 * Format: "v1.<iv>.<tag>.<ciphertext>" with base64url parts, AES-256-GCM, 12-byte IV.
 * The key lives outside the database, so a database dump alone does not expose the data.
 */
const VERSION = "v1";

function toKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("Encryption key must be 32 bytes");
  return key;
}

export function encryptField(plain: string, base64Key: string, context: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", toKey(base64Key), iv);
  // The context (e.g. "MemberPrivate.phone:<memberId>") is bound as associated data,
  // so a ciphertext copied into another column or row fails to decrypt.
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptField(payload: string, base64Key: string, context: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("Unsupported ciphertext format");
  const [, ivPart, tagPart, bodyPart] = parts as [string, string, string, string];
  const decipher = createDecipheriv("aes-256-gcm", toKey(base64Key), Buffer.from(ivPart, "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]).toString("utf8");
}

/** Deterministic keyed hash for uniqueness and lookup without storing the value (phoneHash). */
export function blindIndex(value: string, base64Key: string): string {
  return createHmac("sha256", toKey(base64Key)).update(value, "utf8").digest("base64url");
}
