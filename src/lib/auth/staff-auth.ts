import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings";

/**
 * Staff sign-in (ONB-13, ADM-12): email + password, then an authenticator-app code.
 * There is no public sign-up: Super Admins create staff accounts (scripts/create-staff.ts, later the Staff screen).
 * Members never use this; they have their own link-based sign-in on a separate cookie.
 */
export const staffAuth = betterAuth({
  appName: "PrivateConnet Admin",
  baseURL: env().ADMIN_ORIGIN,
  basePath: "/api/admin/auth",
  secret: env().BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  user: {
    modelName: "staff",
    additionalFields: {
      role: { type: "string", required: true, input: false },
      disabledAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    modelName: "staffSession",
    expiresIn: DEFAULT_SETTINGS.staffSessionHours * 3600,
    // Fixed 12-hour sessions. Activity for the 30-minute idle timeout is tracked in staff-guard.ts,
    // so Better Auth must not refresh updatedAt itself.
    disableSessionRefresh: true,
  },
  account: { modelName: "staffAccount" },
  verification: { modelName: "staffVerification" },
  rateLimit: {
    enabled: true,
    storage: "memory",
    window: DEFAULT_SETTINGS.lockMinutes * 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: DEFAULT_SETTINGS.lockMinutes * 60, max: DEFAULT_SETTINGS.lockAfterFailedTries },
      "/two-factor/verify-totp": { window: DEFAULT_SETTINGS.lockMinutes * 60, max: DEFAULT_SETTINGS.lockAfterFailedTries },
      "/two-factor/verify-backup-code": { window: DEFAULT_SETTINGS.lockMinutes * 60, max: DEFAULT_SETTINGS.lockAfterFailedTries },
    },
  },
  advanced: {
    cookiePrefix: "pc_admin",
    useSecureCookies: env().ADMIN_ORIGIN.startsWith("https://"),
    defaultCookieAttributes: { sameSite: "strict", httpOnly: true },
  },
  plugins: [
    twoFactor({
      issuer: "PrivateConnet Admin",
      schema: { twoFactor: { modelName: "staffTwoFactor" } },
    }),
    nextCookies(), // must stay last: lets server actions set the session cookie
  ],
});

export type StaffSession = typeof staffAuth.$Infer.Session;
