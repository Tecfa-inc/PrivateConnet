import { describe, expect, it } from "vitest";
import { diffProfile, pinInput, profileEditInput, revisionFlags, sanitizeChanges } from "@/features/member/profile";
import { decisionInput } from "@/features/admin/review/review";

const live = {
  displayName: "Korto",
  bio: "Weekends at the beach, Sunday jollof.",
  occupation: "Nurse",
  interests: ["Beach", "Cooking"] as ("Beach" | "Cooking")[],
  lookingFor: "RELATIONSHIP" as const,
  gender: "WOMAN" as const,
};

describe("profile edits (PRO-01, PRO-03)", () => {
  it("records only the fields that changed", () => {
    const proposed = profileEditInput.parse({ ...live, bio: "Long talks about books.", interests: ["Beach", "Cooking"] });
    expect(diffProfile(live, proposed)).toEqual({ bio: "Long talks about books." });
    expect(diffProfile(live, profileEditInput.parse(live))).toEqual({});
  });

  it("treats a cleared optional field as a change to null", () => {
    const proposed = profileEditInput.parse({ ...live, occupation: "", gender: "" });
    expect(diffProfile(live, proposed)).toEqual({ occupation: null, gender: null });
  });

  it("enforces the PRO-01 limits", () => {
    expect(() => profileEditInput.parse({ ...live, bio: "x".repeat(501) })).toThrow();
    expect(() => profileEditInput.parse({ ...live, displayName: "" })).toThrow();
    expect(() =>
      profileEditInput.parse({ ...live, interests: ["Reading", "Music", "Church", "Mosque", "Football", "Cooking", "Travel", "Beach", "Dancing"] }),
    ).toThrow();
    expect(() => profileEditInput.parse({ ...live, interests: ["Nightlife"] })).toThrow(); // not on the fixed list
  });

  it("only ever applies whitelisted public fields", () => {
    const stored = { bio: "New bio", status: "ACTIVE", verified: true, ageYears: 18, confirmedAt: null, occupation: null };
    expect(sanitizeChanges(stored)).toEqual({ bio: "New bio", occupation: null });
    expect(sanitizeChanges(null)).toEqual({});
    expect(() => sanitizeChanges({ lookingFor: "PAID" })).toThrow();
  });
});

describe("contact details and prices are flagged for review (PRO-06)", () => {
  it("flags phone numbers, links and prices", () => {
    expect(revisionFlags({ bio: "WhatsApp me 0886 123 456" })).toContain("PHONE_NUMBER");
    expect(revisionFlags({ bio: "find me on insta @korto_lr" })).toContain("LINK_OR_HANDLE");
    expect(revisionFlags({ bio: "USD 50 per night" })).toContain("PRICE");
    expect(revisionFlags({ occupation: "Nurse" })).toEqual([]);
    expect(revisionFlags({ interests: ["Music"] })).toEqual([]);
  });
});

describe("review decisions (ADM-05)", () => {
  it("needs a reason to reject, not to approve", () => {
    expect(decisionInput.safeParse({ id: "x", decision: "APPROVE" }).success).toBe(true);
    expect(decisionInput.safeParse({ id: "x", decision: "REJECT" }).success).toBe(false);
    expect(decisionInput.safeParse({ id: "x", decision: "REJECT", reason: "Please remove your number." }).success).toBe(true);
  });
});

describe("device PIN rules (ONB-10)", () => {
  it("needs 4 matching digits that aren't trivial", () => {
    expect(pinInput.safeParse({ pin: "4821", confirm: "4821" }).success).toBe(true);
    expect(pinInput.safeParse({ pin: "4821", confirm: "4822" }).success).toBe(false);
    expect(pinInput.safeParse({ pin: "1111", confirm: "1111" }).success).toBe(false);
    expect(pinInput.safeParse({ pin: "1234", confirm: "1234" }).success).toBe(false);
    expect(pinInput.safeParse({ pin: "123", confirm: "123" }).success).toBe(false);
  });
});
