import { VerifyCodeForm } from "../SignInForm";

export default function AdminVerifyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 text-admin-body text-ink">
      <h1 className="text-[20px] font-bold">Two-step sign-in</h1>
      <p className="text-text-muted">Open your authenticator app and enter the code shown for PrivateConnet Admin.</p>
      <VerifyCodeForm />
    </main>
  );
}
