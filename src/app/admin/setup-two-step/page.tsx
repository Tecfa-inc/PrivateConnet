import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff-guard";
import { db } from "@/lib/db";
import { SetupForm } from "./SetupForm";

export default async function SetupTwoStepPage() {
  const staff = await requireStaff(undefined, { allowTwoFactorSetup: true });
  const record = await db.staff.findUnique({ where: { id: staff.id }, select: { twoFactorEnabled: true } });
  if (record?.twoFactorEnabled) redirect("/admin");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10 text-admin-body text-ink">
      <h1 className="text-[22px] font-bold">Set up two-step sign-in</h1>
      <p className="text-text-muted">
        Staff can see private member details, so every staff account needs a code from an authenticator app as well as a
        password. You can&apos;t open any admin page until this is done.
      </p>
      <SetupForm />
    </main>
  );
}
