import { en } from "@/lib/i18n/en";
import { requireMember } from "@/lib/auth/member-session";
import { loadOwnProfile } from "@/features/member/own-profile";
import { INTERESTS } from "@/features/admin/members/schemas";
import { MemberScreen, TextLink } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { EditProfileForm } from "./EditProfileForm";

export const dynamic = "force-dynamic";

/** Request a profile change (ONB-07 "request changes", PRO-01 to PRO-03, PRO-06). */
export default async function EditProfilePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const member = await requireMember({ stage: "onboarding" });
  const { from } = await searchParams;
  const profile = await loadOwnProfile(member.memberId);
  // Start from the pending edit if there is one, so a second visit doesn't lose it.
  const current = { ...profile, ...(profile.pendingChanges ?? {}) };
  const back = from === "welcome" || !member.confirmed ? "/welcome" : "/profile";

  return (
    <MemberScreen logo={false}>
      <TextLink href={back}>← Back</TextLink>
      <h1 className="text-title-1 font-bold tracking-tight">Edit profile</h1>
      <p className="text-text-muted">
        Changes are checked by our team before other members see them. Your current profile stays up until then.
      </p>
      <EditProfileForm
        interests={INTERESTS}
        values={{
          displayName: current.displayName,
          bio: current.bio,
          occupation: current.occupation ?? "",
          interests: current.interests,
          lookingFor: current.lookingFor,
          gender: current.gender ?? "",
          showGender: profile.showGender,
          showOccupation: profile.showOccupation,
        }}
        labels={{ lookingFor: en.lookingFor, gender: en.gender }}
      />
      <SupportLine />
    </MemberScreen>
  );
}
