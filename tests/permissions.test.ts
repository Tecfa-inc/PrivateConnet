import { describe, expect, it } from "vitest";
import { assertCan, can, ForbiddenError } from "@/lib/auth/permissions";

describe("permissions matrix (PRD: User roles and permissions)", () => {
  it("visitors see only public pages and can use a sign-in link", () => {
    expect(can("VISITOR", "public.view")).toBe(true);
    expect(can("VISITOR", "member.signInWithLink")).toBe(true);
    expect(can("VISITOR", "members.browse")).toBe(false); // D2: members-only discovery
  });

  it("only members can connect, reveal numbers and plan meetings", () => {
    for (const role of ["VISITOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const) {
      expect(can(role, "connections.manage")).toBe(false);
      expect(can(role, "connections.revealNumber")).toBe(false);
      expect(can(role, "meetings.manage")).toBe(false);
    }
    expect(can("MEMBER", "connections.revealNumber")).toBe(true);
  });

  it("moderators cannot see private data or create members", () => {
    expect(can("MODERATOR", "members.revealPrivate")).toBe(false);
    expect(can("MODERATOR", "members.create")).toBe(false);
    expect(can("MODERATOR", "members.suspend")).toBe(true);
    expect(can("MODERATOR", "members.deactivate")).toBe(false);
  });

  it("only Super Admins delete permanently, manage staff and change settings", () => {
    for (const cap of ["members.deletePermanently", "staff.manage", "settings.change", "audit.viewAll"] as const) {
      expect(can("ADMIN", cap)).toBe(false);
      expect(can("SUPER_ADMIN", cap)).toBe(true);
    }
    expect(can("ADMIN", "audit.viewOwn")).toBe(true);
  });

  it("assertCan throws ForbiddenError", () => {
    expect(() => assertCan("MEMBER", "members.create")).toThrow(ForbiddenError);
    expect(() => assertCan("ADMIN", "members.create")).not.toThrow();
  });
});
