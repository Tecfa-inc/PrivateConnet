import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { getMemberContext } from "@/lib/auth/member-session";
import { can } from "@/lib/auth/permissions";
import { PhotoRejectedError } from "@/lib/media";
import { addPhoto } from "@/features/member/photos";

export const dynamic = "force-dynamic";

/**
 * Photo upload (PRO-01, PRO-04). A plain multipart form posts here, so uploading works without
 * JavaScript on slow phones. The answer is always a 303 back to the photos page with a status code.
 */
export async function POST(request: Request): Promise<Response> {
  const back = (from: string | null, query: string) => {
    const page = from === "welcome" ? "/profile/photos?from=welcome&" : "/profile/photos?";
    return NextResponse.redirect(new URL(`${page}${query}`, env().APP_ORIGIN), 303);
  };

  // Same-origin form posts only (the session cookie is SameSite=Lax as well).
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(env().APP_ORIGIN).origin) return new Response("Forbidden", { status: 403 });

  const member = await getMemberContext();
  if (!member || member.status === "SUSPENDED" || member.status === "DEACTIVATED" || !member.pinUnlocked) {
    return NextResponse.redirect(new URL("/signed-out", env().APP_ORIGIN), 303);
  }
  if (!can("MEMBER", "profile.editOwn")) return new Response("Forbidden", { status: 403 });

  // Refuse oversized bodies before reading them (the multipart overhead is small).
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > DEFAULT_SETTINGS.maxPhotoUploadMb * 1024 * 1024 + 64 * 1024) return back(null, "error=too-big");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return back(null, "error=not-photo");
  }
  const from = typeof form.get("from") === "string" ? String(form.get("from")) : null;
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return back(from, "error=not-photo");

  try {
    await addPhoto(member.memberId, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    if (err instanceof PhotoRejectedError) return back(from, `error=${err.code}`);
    throw err;
  }
  return back(from, "added=1");
}
