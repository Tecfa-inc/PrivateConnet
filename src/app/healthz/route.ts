import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Uptime check (NFR-15). Returns no data, only whether the app and database answer. */
export async function GET(): Promise<Response> {
  try {
    await db.$queryRaw`SELECT 1`;
    return new Response("ok", { status: 200, headers: { "cache-control": "no-store" } });
  } catch {
    return new Response("unavailable", { status: 503, headers: { "cache-control": "no-store" } });
  }
}
