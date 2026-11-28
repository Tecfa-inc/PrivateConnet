import { randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { sign, verifySignature } from "@/lib/crypto/signing";

/**
 * Private photo storage (PRO-04, NFR-02, NFR-07). Files live under MEDIA_ROOT, outside the web root,
 * one folder per photo with three WebP sizes. Originals are never written to disk, and sharp drops
 * all metadata (EXIF, GPS location) unless asked to keep it, which we never do.
 */
export const PHOTO_SIZES = {
  list: { width: 360, height: 450, fit: "cover" }, // discovery cards (4:5)
  profile: { width: 720, height: 900, fit: "inside" }, // profile page
  review: { width: 1080, height: 1350, fit: "inside" }, // admin review queue
} as const;

export type PhotoSize = keyof typeof PHOTO_SIZES;

export const isPhotoSize = (s: string): s is PhotoSize => Object.hasOwn(PHOTO_SIZES, s);

/** Storage keys are 32 lowercase hex characters, so a key can never walk out of MEDIA_ROOT. */
const KEY_PATTERN = /^[a-f0-9]{32}$/;
export const isStorageKey = (k: string): boolean => KEY_PATTERN.test(k);
export const newStorageKey = (): string => randomBytes(16).toString("hex");

export function mediaFilePath(key: string, size: PhotoSize, root: string = env().MEDIA_ROOT): string {
  if (!isStorageKey(key)) throw new Error("Bad storage key");
  return path.join(root, key, `${size}.webp`);
}

export type PhotoProblem = "too-big" | "not-photo" | "wrong-format" | "too-small" | "too-many";

export const PHOTO_PROBLEM_TEXT: Record<PhotoProblem, string> = {
  "too-big": `Photos must be smaller than ${DEFAULT_SETTINGS.maxPhotoUploadMb} MB.`,
  "not-photo": "That file is not a photo we can use. Try a JPEG or PNG.",
  "wrong-format": "Use a JPEG, PNG or WebP photo.",
  "too-small": "That photo is too small. Use one at least 300 pixels wide.",
  "too-many": `You can have up to ${DEFAULT_SETTINGS.maxPhotos} photos. Remove one first.`,
};

export class PhotoRejectedError extends Error {
  constructor(public readonly code: PhotoProblem) {
    super(PHOTO_PROBLEM_TEXT[code]);
    this.name = "PhotoRejectedError";
  }
}

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

/** Turns an uploaded image into the three stored sizes. Throws PhotoRejectedError for anything unusable. */
export async function processPhoto(input: Buffer): Promise<Record<PhotoSize, Buffer>> {
  if (input.length > DEFAULT_SETTINGS.maxPhotoUploadMb * 1024 * 1024) {
    throw new PhotoRejectedError("too-big");
  }
  const meta = await sharp(input, { limitInputPixels: 40_000_000 })
    .metadata()
    .catch(() => null);
  if (!meta) throw new PhotoRejectedError("not-photo");
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) {
    throw new PhotoRejectedError("wrong-format");
  }
  if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 300) {
    throw new PhotoRejectedError("too-small");
  }

  const out = {} as Record<PhotoSize, Buffer>;
  for (const [size, spec] of Object.entries(PHOTO_SIZES) as [PhotoSize, (typeof PHOTO_SIZES)[PhotoSize]][]) {
    out[size] = await sharp(input, { limitInputPixels: 40_000_000 })
      .rotate() // apply the camera's orientation before the metadata is dropped
      .resize({ width: spec.width, height: spec.height, fit: spec.fit, withoutEnlargement: spec.fit === "inside" })
      .webp({ quality: size === "list" ? 70 : 76 })
      .toBuffer();
  }
  return out;
}

export async function savePhotoFiles(key: string, files: Record<PhotoSize, Buffer>): Promise<void> {
  const dir = path.dirname(mediaFilePath(key, "list"));
  await mkdir(dir, { recursive: true, mode: 0o750 });
  await Promise.all(
    (Object.keys(files) as PhotoSize[]).map((size) => writeFile(mediaFilePath(key, size), files[size], { mode: 0o640 })),
  );
}

export async function deletePhotoFiles(key: string): Promise<void> {
  if (!isStorageKey(key)) return;
  await rm(path.dirname(mediaFilePath(key, "list")), { recursive: true, force: true });
}

export async function readPhotoFile(key: string, size: PhotoSize): Promise<Buffer | null> {
  try {
    return await readFile(mediaFilePath(key, size));
  } catch {
    return null;
  }
}

// ─── Short-lived signed links (NFR-07) ───

const signedText = (key: string, size: PhotoSize, exp: number) => `${key}/${size}:${exp}`;

/** A link that works for a few minutes only, so a copied address soon stops working. */
export function signedMediaUrl(key: string, size: PhotoSize, now: Date = new Date(), signingKey?: string): string {
  const exp = Math.floor(now.getTime() / 1000) + DEFAULT_SETTINGS.mediaLinkMinutes * 60;
  const sig = sign("media", signedText(key, size, exp), signingKey);
  return `/media/${key}/${size}?exp=${exp}&sig=${sig}`;
}

export function mediaRequestIsValid(
  args: { key: string; size: string; exp: string | null; sig: string | null; now?: Date },
  signingKey?: string,
): boolean {
  if (!isStorageKey(args.key) || !isPhotoSize(args.size) || !args.exp || !args.sig) return false;
  const exp = Number(args.exp);
  if (!Number.isInteger(exp)) return false;
  const nowSeconds = Math.floor((args.now ?? new Date()).getTime() / 1000);
  // Expired, or dated further ahead than we ever sign: refuse.
  if (exp < nowSeconds || exp > nowSeconds + DEFAULT_SETTINGS.mediaLinkMinutes * 60 + 5) return false;
  return verifySignature("media", signedText(args.key, args.size, exp), args.sig, signingKey);
}
