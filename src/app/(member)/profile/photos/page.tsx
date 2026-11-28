import { requireMember } from "@/lib/auth/member-session";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { en } from "@/lib/i18n/en";
import { PHOTO_PROBLEM_TEXT, signedMediaUrl, type PhotoProblem } from "@/lib/media";
import { listOwnPhotos } from "@/features/member/photos";
import { Callout, MemberScreen, PinkButton, TextLink } from "@/components/member/ui";
import { SupportLine } from "@/components/member/SupportLine";
import { removePhotoAction } from "../../actions";

export const dynamic = "force-dynamic";

/** Add and remove photos (PRO-01, PRO-03, PRO-04). New photos wait for review before others see them. */
export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ from?: string; error?: string; added?: string }> }) {
  const member = await requireMember({ stage: "onboarding" });
  const { from, error, added } = await searchParams;
  const photos = await listOwnPhotos(member.memberId);
  const back = from === "welcome" || !member.confirmed ? "/welcome" : "/profile";
  const problem = error && Object.hasOwn(PHOTO_PROBLEM_TEXT, error) ? PHOTO_PROBLEM_TEXT[error as PhotoProblem] : null;
  const canAdd = photos.length < DEFAULT_SETTINGS.maxPhotos;

  return (
    <MemberScreen logo={false}>
      <TextLink href={back}>← Back</TextLink>
      <h1 className="text-title-1 font-bold tracking-tight">Your photos</h1>
      <p className="text-text-muted">
        Up to {DEFAULT_SETTINGS.maxPhotos} photos. Our team checks each new photo before other members see it. We remove
        location data from every photo.
      </p>
      {problem && <Callout tone="error">{problem}</Callout>}
      {added && <Callout tone="success">Photo added. It&apos;s waiting for review.</Callout>}

      <ul className="grid grid-cols-2 gap-3">
        {photos.map((p) => (
          <li key={p.id} className="flex flex-col gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private URL */}
            <img src={signedMediaUrl(p.storageKey, "list")} alt="Your photo" width={180} height={225} className="aspect-[4/5] w-full rounded-lg object-cover" />
            <span className={`text-small ${p.status === "PENDING" ? "font-semibold text-warning-800" : "text-text-secondary"}`}>
              {p.status === "PENDING" ? en.review.pendingPhoto : "Approved"}
            </span>
            <form action={removePhotoAction}>
              <input type="hidden" name="photoId" value={p.id} />
              <input type="hidden" name="back" value={from === "welcome" ? "welcome" : ""} />
              <button className="h-touch w-full rounded-md border border-control-border font-semibold">Remove</button>
            </form>
          </li>
        ))}
      </ul>

      {canAdd ? (
        <form action="/api/member/photos" method="post" encType="multipart/form-data" className="flex flex-col gap-3">
          <input type="hidden" name="from" value={from === "welcome" ? "welcome" : ""} />
          <label className="flex flex-col gap-1.5 text-small font-semibold">
            Choose a photo (JPEG or PNG, under {DEFAULT_SETTINGS.maxPhotoUploadMb} MB)
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              required
              className="min-h-touch rounded-md border border-control-border p-2 text-body file:mr-3 file:h-10 file:rounded file:border-0 file:bg-surface-100 file:px-3 file:font-semibold"
            />
          </label>
          <PinkButton>Upload photo</PinkButton>
        </form>
      ) : (
        <Callout>{PHOTO_PROBLEM_TEXT["too-many"]}</Callout>
      )}
      <SupportLine />
    </MemberScreen>
  );
}
