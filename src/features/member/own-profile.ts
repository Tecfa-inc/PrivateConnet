import { db } from "@/lib/db";
import { signedMediaUrl } from "@/lib/media";
import { sanitizeChanges } from "./profile";

/**
 * The signed-in member's own profile, for their own screens. Public fields only: never MemberPrivate
 * (rule 7), and the phone row on screen is a fixed sentence, not data (rule 1).
 */
export async function loadOwnProfile(memberId: string, now: Date = new Date()) {
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: {
      displayName: true,
      ageYears: true,
      lookingFor: true,
      gender: true,
      occupation: true,
      bio: true,
      interests: true,
      showGender: true,
      showOccupation: true,
      verified: true,
      status: true,
      city: { select: { name: true, area: true } },
      photos: {
        where: { status: { not: "REJECTED" } },
        orderBy: { position: "asc" },
        select: { id: true, storageKey: true, status: true },
      },
      revisions: { where: { status: "PENDING" }, select: { changes: true, flags: true }, take: 1 },
    },
  });
  const pending = member.revisions[0];
  return {
    ...member,
    cityLabel: member.city.area ? `${member.city.area}, ${member.city.name}` : member.city.name,
    photos: member.photos.map((p) => ({ id: p.id, status: p.status, url: signedMediaUrl(p.storageKey, "profile", now) })),
    pendingChanges: pending ? sanitizeChanges(pending.changes) : null,
  };
}

export type OwnProfile = Awaited<ReturnType<typeof loadOwnProfile>>;
