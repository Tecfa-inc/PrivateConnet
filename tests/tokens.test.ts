import { describe, expect, it } from "vitest";
import { hashPin, hashToken, newToken, tokensMatch, verifyPin } from "@/lib/crypto/tokens";

describe("sign-in tokens (ONB-05)", () => {
  it("is 256 bits, URL-safe and unique", () => {
    const a = newToken();
    expect(Buffer.from(a, "base64url")).toHaveLength(32);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(newToken()).not.toBe(a);
  });

  it("stores only a hash", () => {
    const t = newToken();
    expect(hashToken(t)).not.toContain(t);
    expect(tokensMatch(hashToken(t), hashToken(t))).toBe(true);
    expect(tokensMatch(hashToken(t), hashToken(newToken()))).toBe(false);
  });
});

describe("device PIN (ONB-10)", () => {
  it("accepts the right PIN and rejects others", async () => {
    const stored = await hashPin("4821");
    expect(await verifyPin("4821", stored)).toBe(true);
    expect(await verifyPin("1111", stored)).toBe(false);
  });

  it("only accepts 4 digits", async () => {
    await expect(hashPin("12345")).rejects.toThrow();
    await expect(hashPin("12a4")).rejects.toThrow();
  });
});
