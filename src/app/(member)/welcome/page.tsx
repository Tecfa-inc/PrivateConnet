import { redirect } from "next/navigation";
import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { loadOwnProfile } from "@/features/member/own-profile";
import { Callout, MemberScreen, TextLink } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { ProfileSummary } from "@/components/member/ProfileSummary";
import { PublishForm } from "./PublishForm";

export const dynamic = "force-dynamic";

/** Step 2 of 3 — "Check your profile" (ONB-07, US-03). Nothing is visible to other members until Publish. */
export default async function WelcomePage() {
  const member = await requireMember({ stage: "onboarding" });
  if (member.confirmed) redirect("/home");
  const profile = await loadOwnProfile(member.memberId);

  return (
    <MemberScreen logo={false}>
      <div className="flex items-center justify-between text-small">
        <span className="text-text-secondary">{en.onboarding.step(2)}</span>
        <span className="font-semibold text-pink-800">{en.onboarding.notVisible}</span>
      </div>
      <h1 className="text-title-2 font-bold tracking-tight">{en.onboarding.checkTitle}</h1>
      <ProfileSummary profile={profile} photosHref="/profile/photos?from=welcome" />
      {profile.pendingChanges && <Callout>{en.review.pendingEdit}</Callout>}
      <TextLink href="/profile/edit?from=welcome">{en.onboarding.requestChange}</TextLink>
      <PublishForm />
      <SupportLine />
    </MemberScreen>
  );
}
