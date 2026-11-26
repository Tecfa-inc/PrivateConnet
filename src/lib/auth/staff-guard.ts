import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { staffAuth } from "./staff-auth";
import { assertCan, type Capability, type Role } from "./permissions";
import { staffAccessDecision } from "./staff-access";
import { db } from "@/lib/db";

export { staffAccessDecision };

export type StaffContext = { id: string; name: string; email: string; role: Role };

/**
 * Call at the top of every admin page and admin server action (CLAUDE.md rule 5).
 * No admin page loads until the staff member has two-step sign-in turned on.
 */
export async function requireStaff(capability?: Capability, opts: { allowTwoFactorSetup?: boolean } = {}): Promise<StaffContext> {
  const session = await staffAuth.api.getSession({ headers: await headers() });
  const user = session?.user as
    | (NonNullable<typeof session>["user"] & { role?: string; disabledAt?: Date | null; twoFactorEnabled?: boolean | null })
    | undefined;
  const decision = staffAccessDecision({
    hasSession: Boolean(session),
    role: user?.role,
    disabledAt: user?.disabledAt,
    twoFactorEnabled: user?.twoFactorEnabled,
    lastActiveAt: session?.session.updatedAt ? new Date(session.session.updatedAt) : undefined,
  });

  if (decision === "idle" || decision === "disabled") {
    await staffAuth.api.signOut({ headers: await headers() });
    redirect(`/admin/sign-in?reason=${decision}`);
  }
  if (decision === "sign-in") redirect("/admin/sign-in");
  if (decision === "setup-two-factor" && !opts.allowTwoFactorSetup) redirect("/admin/setup-two-step");

  // Record activity at most once a minute; the idle check above reads this value.
  const lastActive = new Date(session!.session.updatedAt).getTime();
  if (Date.now() - lastActive > 60_000) {
    await db.staffSession.update({ where: { id: session!.session.id }, data: { updatedAt: new Date() } });
  }

  const staff: StaffContext = { id: user!.id, name: user!.name, email: user!.email, role: user!.role as Role };
  if (capability) assertCan(staff.role, capability);
  return staff;
}
