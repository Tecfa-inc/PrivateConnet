import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { blindIndex, decryptField, encryptField } from "@/lib/crypto/field-encryption";

const key = randomBytes(32).toString("base64");
const otherKey = randomBytes(32).toString("base64");

describe("field encryption (CLAUDE.md rule 7)", () => {
  it("round-trips a value", () => {
    const c = encryptField("Korto Dolo", key, "MemberPrivate.legalName:m1");
    expect(decryptField(c, key, "MemberPrivate.legalName:m1")).toBe("Korto Dolo");
  });

  it("never stores the plain value", () => {
    expect(encryptField("+231778104168", key, "ctx")).not.toContain("231778104168");
  });

  it("produces a different ciphertext each time", () => {
    expect(encryptField("same", key, "ctx")).not.toBe(encryptField("same", key, "ctx"));
  });

  it("rejects a ciphertext moved to another row or column", () => {
    const c = encryptField("+231778104168", key, "MemberPrivate.phone:m1");
    expect(() => decryptField(c, key, "MemberPrivate.phone:m2")).toThrow();
  });

  it("rejects the wrong key and tampered data", () => {
    const c = encryptField("secret", key, "ctx");
    expect(() => decryptField(c, otherKey, "ctx")).toThrow();
    const parts = c.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decryptField(parts.join("."), key, "ctx")).toThrow();
  });

  it("blind index is stable, keyed and distinct", () => {
    expect(blindIndex("+231778104168", key)).toBe(blindIndex("+231778104168", key));
    expect(blindIndex("+231778104168", key)).not.toBe(blindIndex("+231778104168", otherKey));
    expect(blindIndex("+231778104168", key)).not.toBe(blindIndex("+231778104169", key));
  });
});
