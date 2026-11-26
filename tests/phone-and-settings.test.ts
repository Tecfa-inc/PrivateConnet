import { describe, expect, it } from "vitest";
import { formatPhone, telHref, toE164 } from "@/lib/phone";
import { NEUTRAL_NOTICE, priorityForReason } from "@/lib/settings";

describe("phone numbers", () => {
  it("accepts Liberian local and international input", () => {
    expect(toE164("0778104168")).toBe("+231778104168");
    expect(toE164("+231 77 810 4168")).toBe("+231778104168");
  });

  it("rejects invalid numbers", () => {
    expect(toE164("12345")).toBeNull();
    expect(toE164("not a number")).toBeNull();
  });

  it("formats for display and builds the tel: link (CAL-03)", () => {
    expect(formatPhone("+231778104168")).toMatch(/^\+231 /);
    expect(telHref("+231778104168")).toBe("tel:+231778104168");
    expect(() => telHref("0778104168")).toThrow();
  });
});

describe("report priority (ADM-07)", () => {
  it("puts safety-critical reasons first", () => {
    expect(priorityForReason("SUSPECTED_UNDER_18")).toBe("HIGH");
    expect(priorityForReason("HARASSMENT")).toBe("HIGH");
    expect(priorityForReason("ASKED_FOR_MONEY")).toBe("MEDIUM");
    expect(priorityForReason("WRONG_PHONE_NUMBER")).toBe("NORMAL");
  });
});

describe("neutral notifications (NOT-04)", () => {
  it("uses the approved wording", () => {
    expect(NEUTRAL_NOTICE).toBe("You have a new update on PrivateConnet.");
  });
});
