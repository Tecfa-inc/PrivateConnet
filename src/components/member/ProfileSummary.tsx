import Link from "next/link";
import { en } from "@/lib/i18n/en";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import type { OwnProfile } from "@/features/member/own-profile";
import { Row } from "./ui";

/** Photos plus the field list from the approved "Check your profile" screen. Server component. */
export function ProfileSummary({ profile, photosHref }: { profile: OwnProfile; photosHref: string }) {
  const canAdd = profile.photos.length < DEFAULT_SETTINGS.maxPhotos;
  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {profile.photos.map((p) => (
          <figure key={p.id} className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed, short-lived private URL; next/image would cache it */}
            <img src={p.url} alt="Your photo" width={110} height={130} className="h-[130px] w-[110px] rounded-lg object-cover" />
            {p.status === "PENDING" && (
              <figcaption className="absolute inset-x-1 bottom-1 rounded bg-surface-0/95 px-1 py-0.5 text-center text-[13px] font-semibold text-warning-800">
                {en.review.pendingPhoto}
              </figcaption>
            )}
          </figure>
        ))}
        {canAdd ? (
          <Link
            href={photosHref}
            className="flex h-[130px] w-[110px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-dashed border-control-border text-center text-small font-semibold text-pink-800"
          >
            {en.onboarding.addPhotos}
          </Link>
        ) : (
          <div className="flex h-[130px] w-[110px] shrink-0 items-center justify-center rounded-lg border-[1.5px] border-dashed border-line-100 text-center text-small text-text-secondary">
            {en.onboarding.noMorePhotos}
          </div>
        )}
      </div>

      <div className="border-t border-line-50">
        <Row label={en.fields.displayName}>{profile.displayName}</Row>
        <Row label={en.fields.age}>{profile.ageYears}</Row>
        <Row label={en.fields.city}>{profile.cityLabel}</Row>
        <Row label={en.fields.lookingFor}>{en.lookingFor[profile.lookingFor]}</Row>
        {profile.gender && (
          <Row label={en.fields.gender}>
            {en.gender[profile.gender]} · <span className="font-normal text-text-secondary">{profile.showGender ? en.fields.shown : en.fields.hidden}</span>
          </Row>
        )}
        {profile.occupation && (
          <Row label={en.fields.occupation}>
            {profile.occupation} · <span className="font-normal text-text-secondary">{profile.showOccupation ? en.fields.shown : en.fields.hidden}</span>
          </Row>
        )}
        <Row label={en.fields.phone}>{en.onboarding.phoneRow}</Row>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-text-secondary">{en.fields.bio}</span>
        <p className="whitespace-pre-line">{profile.bio}</p>
      </div>
      {profile.interests.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={en.fields.interests}>
          {profile.interests.map((i) => (
            <li key={i} className="rounded-full bg-surface-100 px-3 py-1.5 text-small">
              {i}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
