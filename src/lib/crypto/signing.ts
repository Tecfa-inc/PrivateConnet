import { createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { tokensMatch } from "./tokens";

/**
 * HMAC-SHA256 signatures for short-lived values the server hands to browsers: photo links (NFR-07)
 * and the PIN-unlock cookie (ONB-10). The purpose is part of the signed text, so a signature made
 * for one purpose can never be replayed for another.
 */
export function sign(purpose: string, value: string, base64Key: string = env().MEDIA_SIGNING_KEY): string {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("Signing key must be 32 bytes");
  return createHmac("sha256", key).update(`${purpose}\n${value}`, "utf8").digest("base64url");
}

export function verifySignature(purpose: string, value: string, signature: string, base64Key?: string): boolean {
  if (!signature || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
  return tokensMatch(sign(purpose, value, base64Key), signature);
}
