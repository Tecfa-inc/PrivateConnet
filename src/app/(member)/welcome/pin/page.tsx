import Link from "next/link";
import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { MemberScreen } from "@/components/member/ui";
import { PinForm } from "@/components/member/PinForm";

export const dynamic = "force-dynamic";

/** Step 3 of 3, optional — a PIN for this phone (ONB-10). */
export default async function WelcomePinPage() {
  await requireMember();
  return (
    <MemberScreen logo={false}>
      <span className="text-small text-text-secondary">{en.onboarding.step(3)} · Optional</span>
      <h1 className="text-title-2 font-bold tracking-tight">{en.onboarding.pinTitle}</h1>
      <p className="text-text-muted">{en.onboarding.pinBody}</p>
      <PinForm submitLabel={en.onboarding.savePin} next="home" />
      <Link href="/home" className="flex h-button items-center justify-center rounded-lg font-semibold text-ink underline underline-offset-4">
        {en.onboarding.skip}
      </Link>
    </MemberScreen>
  );
}
