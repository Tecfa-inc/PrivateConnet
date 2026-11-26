/**
 * Creates a staff account from the server's command line. Use it for the first two Super Admins;
 * later staff are added from the admin Staff screen (M6).
 *
 *   npm run staff:create -- --email a.kollie@example.com --name "A. Kollie" --role SUPER_ADMIN
 *
 * Prints a one-time password once. The person signs in with it and must set up two-step
 * sign-in before any admin page opens (ADM-12).
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/lib/db";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" }, role: { type: "string" } },
});

const roles = ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const;
type StaffRole = (typeof roles)[number];

async function main() {
  const email = values.email?.trim().toLowerCase();
  const name = values.name?.trim();
  const role = values.role as StaffRole | undefined;
  if (!email || !name || !role || !roles.includes(role)) {
    throw new Error('Usage: --email <email> --name "<name>" --role SUPER_ADMIN|ADMIN|MODERATOR');
  }
  if (await db.staff.findUnique({ where: { email } })) throw new Error("A staff account with this email already exists");

  const password = randomBytes(18).toString("base64url"); // 24 characters
  const passwordHash = await hashPassword(password);
  const staff = await db.$transaction(async (tx) => {
    const created = await tx.staff.create({ data: { name, email, role, emailVerified: true } });
    // Better Auth's email/password accounts use providerId "credential" and the user id as accountId.
    await tx.staffAccount.create({
      data: { id: randomBytes(16).toString("hex"), userId: created.id, accountId: created.id, providerId: "credential", password: passwordHash },
    });
    return created;
  });
  // The first Super Admin has no one to record the action; later staff changes go through the audit log.
  console.log(`Created ${role} ${name} <${email}> (id ${staff.id}).`);
  console.log(`One-time password (shown once): ${password}`);
  console.log("They must set up an authenticator app at first sign-in.");
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
