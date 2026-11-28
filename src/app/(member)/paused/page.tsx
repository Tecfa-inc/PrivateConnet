import { en } from "@/lib/i18n/en";
import { MemberScreen } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";

/** Suspended accounts see this paused page instead of the app (architecture: State checks). */
export default function PausedPage() {
  return (
    <MemberScreen>
      <h1 className="mt-6 text-title-1 font-bold tracking-tight">{en.paused.title}</h1>
      <p className="text-text-muted">{en.paused.body}</p>
      <div className="rounded-lg bg-surface-100 p-4">
        <p className="font-semibold">{en.support.contact}</p>
        <SupportLine />
      </div>
    </MemberScreen>
  );
}
