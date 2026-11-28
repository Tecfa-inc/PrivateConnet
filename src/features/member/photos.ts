import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { deletePhotoFiles, newStorageKey, PhotoRejectedError, processPhoto, savePhotoFiles } from "@/lib/media";

/**
 * Member photos (PRO-01, PRO-03, PRO-04). New photos wait in the review queue as PENDING and are
 * shown to other members only after a moderator approves them.
 */
export async function addPhoto(memberId: string, bytes: Buffer): Promise<{ photoId: string }> {
  const kept = await db.photo.count({ where: { memberId, status: { not: "REJECTED" } } });
  if (kept >= DEFAULT_SETTINGS.maxPhotos) {
    throw new PhotoRejectedError("too-many");
  }
  const files = await processPhoto(bytes); // throws PhotoRejectedError for unusable files
  const storageKey = newStorageKey();
  await savePhotoFiles(storageKey, files);
  try {
    const last = await db.photo.findFirst({ where: { memberId }, orderBy: { position: "desc" }, select: { position: true } });
    const photo = await db.photo.create({
      data: { memberId, storageKey, position: last ? last.position + 1 : 0, status: "PENDING" },
    });
    return { photoId: photo.id };
  } catch (err) {
    await deletePhotoFiles(storageKey); // never leave files without a database row
    throw err;
  }
}

/** A member may remove any of their own photos. Relationship check: the photo must be theirs. */
export async function removePhoto(memberId: string, photoId: string): Promise<boolean> {
  const photo = await db.photo.findFirst({ where: { id: photoId, memberId }, select: { id: true, storageKey: true } });
  if (!photo) return false;
  await db.photo.delete({ where: { id: photo.id } });
  await deletePhotoFiles(photo.storageKey);
  return true;
}

export async function listOwnPhotos(memberId: string) {
  return db.photo.findMany({
    where: { memberId, status: { not: "REJECTED" } },
    orderBy: { position: "asc" },
    select: { id: true, storageKey: true, status: true },
  });
}
