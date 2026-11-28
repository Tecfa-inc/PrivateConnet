import { headers } from "next/headers";
import { getMemberContext } from "@/lib/auth/member-session";
import { staffAuth } from "@/lib/auth/staff-auth";
import { staffAccessDecision } from "@/lib/auth/staff-access";
import { isPhotoSize, mediaRequestIsValid, readPhotoFile } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * GET /media/{key}/{size}?exp=&sig= (NFR-07). Streams a private photo only when the link was signed by
 * this server in the last few minutes AND the request comes from a signed-in member or staff member.
 * The signature is the authorization: pages sign only the photos their viewer is allowed to see.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string; size: string }> }): Promise<Response> {
  const { key, size } = await params;
  const url = new URL(request.url);
  const notFound = () => new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

  if (!mediaRequestIsValid({ key, size, exp: url.searchParams.get("exp"), sig: url.searchParams.get("sig") })) return notFound();

  const member = await getMemberContext();
  const memberOk = Boolean(member && member.status !== "DEACTIVATED" && member.status !== "SUSPENDED" && member.pinUnlocked);
  if (!memberOk && !(await staffFullySignedIn())) return notFound();

  if (!isPhotoSize(size)) return notFound();
  const file = await readPhotoFile(key, size);
  if (!file) return notFound();

  return new Response(new Uint8Array(file), {
    status: 200,
    headers: {
      "content-type": "image/webp",
      "content-length": String(file.length),
      // Private, short-lived: never stored by shared caches, gone from the browser cache when the link expires.
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
      "content-disposition": "inline",
    },
  });
}

/** Staff count only with an active, two-step session (CLAUDE.md rule 5), same as the admin guard. */
async function staffFullySignedIn(): Promise<boolean> {
  const session = await staffAuth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session) return false;
  const user = session.user as unknown as { role?: string; disabledAt?: Date | null; twoFactorEnabled?: boolean | null };
  return (
    staffAccessDecision({
      hasSession: true,
      role: user.role,
      disabledAt: user.disabledAt,
      twoFactorEnabled: user.twoFactorEnabled,
      lastActiveAt: session.session.updatedAt ? new Date(session.session.updatedAt) : undefined,
    }) === "ok"
  );
}
