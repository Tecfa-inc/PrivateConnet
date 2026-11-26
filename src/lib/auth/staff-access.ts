import type { Role } from "./permissions";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const STAFF_ROLES = new Set<Role>(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

/** Pure decision used by the guard, kept separate so it can be unit-tested. */
export function staffAccessDecision(args: {
  hasSession: boolean;
  role?: string;
  disabledAt?: Date | null;
  twoFactorEnabled?: boolean | null;
  lastActiveAt?: Date;
  now?: Date;
}): "ok" | "sign-in" | "setup-two-factor" | "disabled" | "idle" {
  if (!args.hasSession || !args.role || !STAFF_ROLES.has(args.role as Role)) return "sign-in";
  if (args.disabledAt) return "disabled";
  const now = args.now ?? new Date();
  if (args.lastActiveAt && now.getTime() - args.lastActiveAt.getTime() > DEFAULT_SETTINGS.staffIdleMinutes * 60_000) {
    return "idle";
  }
  if (!args.twoFactorEnabled) return "setup-two-factor";
  return "ok";
}
