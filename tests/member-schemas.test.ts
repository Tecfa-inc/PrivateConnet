import { describe, expect, it } from "vitest";
import { contactOrPriceFlags, createMemberInput } from "@/features/admin/members/schemas";
import { ageOn } from "@/lib/age";
import { staffAccessDecision } from "@/lib/auth/staff-access";

const NOW = new Date("2026-11-26T12:00:00Z");

const valid = {
  legalName: "Comfort Wesseh",
  displayName: "Comfort",
  dateOfBirth: "1995-04-12",
  phone: "0778 123 456",
  backupContact: "",
  cityId: "city_monrovia_sinkor",
  lookingFor: "RELATIONSHIP",
  bio: "I enjoy cooking, church choir and long walks on the beach.",
  interests: ["Music", "Cooking"],
  consentListed: true,
  consentPhotos: true,
  consentNumberSharing: true,
  phoneVerifiedByCall: true,
};

describe("ageOn", () => {
  it("counts birthdays in Monrovia time", () => {
    expect(ageOn("2008-11-26", NOW)).toBe(18);
    expect(ageOn("2008-11-27", NOW)).toBe(17);
  });
});

describe("createMemberInput (ONB-01 to ONB-05)", () => {
  const schema = createMemberInput(NOW);

  it("accepts a complete, consented member", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("rejects anyone under 18 (ONB-03)", () => {
    expect(schema.safeParse({ ...valid, dateOfBirth: "2008-11-27" }).success).toBe(false);
  });

  it.each(["consentListed", "consentPhotos", "consentNumberSharing", "phoneVerifiedByCall"])("requires %s", (key) => {
    expect(schema.safeParse({ ...valid, [key]: false }).success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    expect(schema.safeParse({ ...valid, phone: "12" }).success).toBe(false);
  });

  it("rejects contact details or prices in the bio (rules 1 and 9)", () => {
    expect(schema.safeParse({ ...valid, bio: "Call me on 0778 123 456" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, bio: "Find me at instagram.com/me" }).success).toBe(false);
  });
});

describe("contactOrPriceFlags", () => {
  it("flags phone numbers, links and prices", () => {
    expect(contactOrPriceFlags("call 0886 555 123")).toContain("PHONE_NUMBER");
    expect(contactOrPriceFlags("www.example.com")).toContain("LINK_OR_HANDLE");
    expect(contactOrPriceFlags("only $50 a night")).toContain("PRICE");
    expect(contactOrPriceFlags("I love jollof rice and football")).toEqual([]);
  });
});

describe("staffAccessDecision (ADM-12, CLAUDE.md rule 5)", () => {
  const base = { hasSession: true, role: "ADMIN", twoFactorEnabled: true, lastActiveAt: NOW, now: NOW };
  it("lets a signed-in admin with two-step through", () => expect(staffAccessDecision(base)).toBe("ok"));
  it("sends staff without two-step to setup", () =>
    expect(staffAccessDecision({ ...base, twoFactorEnabled: false })).toBe("setup-two-factor"));
  it("refuses members and visitors", () => expect(staffAccessDecision({ ...base, role: "MEMBER" })).toBe("sign-in"));
  it("refuses disabled staff", () => expect(staffAccessDecision({ ...base, disabledAt: NOW })).toBe("disabled"));
  it("signs out after 30 idle minutes", () =>
    expect(staffAccessDecision({ ...base, lastActiveAt: new Date(NOW.getTime() - 31 * 60_000) })).toBe("idle"));
});
