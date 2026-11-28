import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { loadOwnProfile } from "@/features/member/own-profile";
import { Callout, MemberScreen, MemberTabs, TextLink } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { ProfileSummary } from "@/components/member/ProfileSummary";

export const dynamic = "force-dynamic";

/** The member's own profile as approved, with any edit still waiting for review (PRO-03). */
export default async function OwnProfilePage() {
  const member = await requireMember();
  const profile = await loadOwnProfile(member.memberId);
  return (
    <MemberScreen>
      <h1 className="text-title-1 font-bold tracking-tight">Your profile</h1>
      {profile.verified && <p className="font-semibold text-pink-800">Verified</p>}
      <ProfileSummary profile={profile} photosHref="/profile/photos" />
      {profile.pendingChanges && <Callout>{en.review.pendingEdit}</Callout>}
      <div className="flex flex-col">
        <TextLink href="/profile/edit">Edit profile</TextLink>
        <TextLink href="/profile/photos">Manage photos</TextLink>
      </div>
      <SupportLine />
      <MemberTabs active="profile" />
    </MemberScreen>
  );
}
