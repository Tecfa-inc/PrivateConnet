import { en } from "@/lib/i18n/en";
import { MemberScreen } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";

/** Shown when there is no valid session on this device (ONB-08, ONB-09, ONB-11). */
export default function SignedOutPage() {
  return (
    <MemberScreen>
      <h1 className="mt-6 text-title-1 font-bold tracking-tight">{en.signedOut.title}</h1>
      <p className="text-text-muted">{en.signedOut.body}</p>
      <div className="rounded-lg bg-surface-100 p-4">
        <p className="font-semibold">{en.support.contact}</p>
        <SupportLine />
      </div>
    </MemberScreen>
  );
}
