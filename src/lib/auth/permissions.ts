/**
 * The PRD permissions matrix as code ("User roles and permissions" section).
 * Role checks are the first of three layers; relationship and state checks follow in each action.
 */
export type Role = "VISITOR" | "MEMBER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";

export type Capability =
  | "public.view"
  | "member.signInWithLink"
  | "members.browse"
  | "connections.manage" // send, accept, decline, withdraw, end
  | "connections.revealNumber" // own connections only; relationship check required
  | "meetings.manage" // own meetings only
  | "profile.editOwn"
  | "safety.blockAndReport"
  | "reports.moderate" // review reports, hide profiles, warn
  | "review.decide" // approve photos and profile edits
  | "members.create" // and issue sign-in links
  | "members.revealPrivate" // legal name, phone, DOB; always audited
  | "members.suspend"
  | "members.deactivate"
  | "members.deletePermanently"
  | "meetings.viewMetadata"
  | "staff.manage"
  | "settings.change"
  | "audit.viewOwn"
  | "audit.viewAll"
  | "analytics.view"
  | "dataRequests.handle";

const MATRIX: Record<Role, readonly Capability[]> = {
  VISITOR: ["public.view", "member.signInWithLink"],
  MEMBER: [
    "public.view",
    "members.browse",
    "connections.manage",
    "connections.revealNumber",
    "meetings.manage",
    "profile.editOwn",
    "safety.blockAndReport",
  ],
  MODERATOR: ["public.view", "members.browse", "reports.moderate", "review.decide", "members.suspend"],
  ADMIN: [
    "public.view",
    "members.browse",
    "reports.moderate",
    "review.decide",
    "members.create",
    "members.revealPrivate",
    "members.suspend",
    "members.deactivate",
    "meetings.viewMetadata",
    "audit.viewOwn",
    "analytics.view",
    "dataRequests.handle",
  ],
  SUPER_ADMIN: [
    "public.view",
    "members.browse",
    "reports.moderate",
    "review.decide",
    "members.create",
    "members.revealPrivate",
    "members.suspend",
    "members.deactivate",
    "members.deletePermanently",
    "meetings.viewMetadata",
    "staff.manage",
    "settings.change",
    "audit.viewOwn",
    "audit.viewAll",
    "analytics.view",
    "dataRequests.handle",
  ],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

export class ForbiddenError extends Error {
  constructor(capability: Capability) {
    super(`Not allowed: ${capability}`);
    this.name = "ForbiddenError";
  }
}

/** Throws unless the role has the capability. Call at the top of every server action. */
export function assertCan(role: Role, capability: Capability): void {
  if (!can(role, capability)) throw new ForbiddenError(capability);
}

export const capabilitiesOf = (role: Role): readonly Capability[] => MATRIX[role];
