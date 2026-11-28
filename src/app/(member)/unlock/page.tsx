import { redirect } from "next/navigation";
import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { MemberScreen } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { UnlockForm } from "./UnlockForm";

export const dynamic = "force-dynamic";

/** PIN screen shown when the app opens on a phone with a PIN (ONB-10, ONB-12). */
export default async function UnlockPage() {
  const member = await requireMember({ stage: "pin" });
  if (member.pinUnlocked) redirect(member.confirmed ? "/home" : "/welcome");
  return (
    <MemberScreen>
      <h1 className="mt-6 text-title-1 font-bold tracking-tight">{en.pin.unlockTitle}</h1>
      <p className="text-text-muted">{en.pin.unlockBody}</p>
      <UnlockForm />
      <p className="text-small text-text-secondary">{en.pin.forgot}</p>
      <SupportLine />
    </MemberScreen>
  );
}
