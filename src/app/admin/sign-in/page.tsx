import { SignInForm } from "./SignInForm";
import { Notice } from "@/components/admin/ui";

const REASONS: Record<string, string> = {
  idle: "You were signed out after 30 minutes without activity.",
  disabled: "This staff account is disabled. Contact a Super Admin.",
};

export default async function AdminSignInPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 text-admin-body text-ink">
      <div>
        <div className="text-[24px] font-bold italic tracking-tight">
          Private<span className="text-pink-800">Connet</span>
        </div>
        <h1 className="text-[20px] font-bold">Staff sign-in</h1>
      </div>
      {reason && REASONS[reason] && <Notice>{REASONS[reason]}</Notice>}
      <SignInForm />
    </main>
  );
}
