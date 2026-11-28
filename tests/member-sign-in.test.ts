import { describe, expect, it } from "vitest";
import { linkState, looksLikeToken, parseDateOfBirth } from "@/features/member/sign-in";
import { deviceSessionDecision, pinUnlockIsValid, pinUnlockValue, shouldRollSession } from "@/lib/auth/member-session";
import { newToken } from "@/lib/crypto/tokens";

const now = new Date("2026-11-28T12:00:00Z");
const hours = (h: number) => new Date(now.getTime() + h * 3_600_000);
const base = { usedAt: null, revokedAt: null, expiresAt: hours(24), lockedUntil: null };

describe("sign-in link state (ONB-05, ONB-12, US-02)", () => {
  it("is valid only when unused, unrevoked, unexpired and unlocked", () => {
    expect(linkState(base, now)).toBe("valid");
    expect(linkState(null, now)).toBe("invalid");
    expect(linkState({ ...base, usedAt: hours(-1) }, now)).toBe("used");
    expect(linkState({ ...base, revokedAt: hours(-1) }, now)).toBe("revoked");
    expect(linkState({ ...base, expiresAt: hours(-1) }, now)).toBe("expired");
    expect(linkState({ ...base, lockedUntil: hours(0.2) }, now)).toBe("locked");
    expect(linkState({ ...base, lockedUntil: hours(-0.1) }, now)).toBe("valid"); // lock has passed
  });

  it("keeps saying 'used' after a used link would have expired", () => {
    expect(linkState({ ...base, usedAt: hours(-100), expiresAt: hours(-50) }, now)).toBe("used");
  });

  it("only accepts tokens of the right shape", () => {
    expect(looksLikeToken(newToken())).toBe(true);
    expect(looksLikeToken("short")).toBe(false);
    expect(looksLikeToken(`${newToken().slice(0, 42)}/`)).toBe(false);
  });
});

describe("date of birth entry (ONB-06)", () => {
  it("builds YYYY-MM-DD from day, month and year", () => {
    expect(parseDateOfBirth("14", "3", "1997")).toBe("1997-03-14");
    expect(parseDateOfBirth(" 01 ", "01", "2000")).toBe("2000-01-01");
  });

  it("rejects impossible dates and bad years", () => {
    expect(parseDateOfBirth("31", "2", "1997")).toBeNull();
    expect(parseDateOfBirth("29", "2", "2001")).toBeNull();
    expect(parseDateOfBirth("29", "2", "2000")).toBe("2000-02-29");
    expect(parseDateOfBirth("10", "10", "97")).toBeNull();
    expect(parseDateOfBirth("a", "1", "1990")).toBeNull();
  });
});

describe("device sessions (ONB-08)", () => {
  it("is usable until it expires or is revoked", () => {
    expect(deviceSessionDecision({ revokedAt: null, expiresAt: hours(1) }, now)).toBe("ok");
    expect(deviceSessionDecision({ revokedAt: null, expiresAt: now }, now)).toBe("expired");
    expect(deviceSessionDecision({ revokedAt: hours(-1), expiresAt: hours(100) }, now)).toBe("revoked");
  });

  it("rolls the 90-day window forward at most hourly", () => {
    expect(shouldRollSession(hours(-0.5), now)).toBe(false);
    expect(shouldRollSession(hours(-1), now)).toBe(true);
  });
});

describe("PIN unlock marker (ONB-10)", () => {
  const key = Buffer.alloc(32, 7).toString("base64");

  it("is valid for the same device only", () => {
    const value = pinUnlockValue("dev1", now, key);
    expect(pinUnlockIsValid(value, "dev1", now, key)).toBe(true);
    expect(pinUnlockIsValid(value, "dev2", now, key)).toBe(false);
    expect(pinUnlockIsValid(undefined, "dev1", now, key)).toBe(false);
  });

  it("expires after 12 hours and can't be forged", () => {
    const value = pinUnlockValue("dev1", now, key);
    expect(pinUnlockIsValid(value, "dev1", hours(13), key)).toBe(false);
    const [id, exp] = value.split(".");
    expect(pinUnlockIsValid(`${id}.${Number(exp) + 99999}.${value.split(".")[2]}`, "dev1", now, key)).toBe(false);
    expect(pinUnlockIsValid(value, "dev1", now, Buffer.alloc(32, 8).toString("base64"))).toBe(false);
  });
});
