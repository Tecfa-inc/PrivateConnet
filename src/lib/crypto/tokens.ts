import { createHash, randomBytes, timingSafeEqual, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** 256-bit random token for sign-in links and device sessions (ONB-05, ONB-08). URL-safe. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Only this hash is stored; the token itself is shown once and never saved. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** PINs are only 4 digits, so they get a slow, salted hash plus attempt limits (ONB-10, ONB-12). */
export async function hashPin(pin: string): Promise<string> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be 4 digits");
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `scrypt.${salt.toString("base64url")}.${hash.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, hashPart] = stored.split(".");
  if (scheme !== "scrypt" || !saltPart || !hashPart) return false;
  const expected = Buffer.from(hashPart, "base64url");
  const actual = await scrypt(pin, Buffer.from(saltPart, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}
