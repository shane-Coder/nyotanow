import { createHash, timingSafeEqual } from "node:crypto";

// TEMPORARY. Added to prove end to end that a server error actually reaches
// Sentry, then removed. Delete this file once the event has been confirmed.
//
// Gated behind STATS_KEY so a crawler or a stranger cannot make production
// throw: without the right key this is an ordinary 404.

export const dynamic = "force-dynamic";

function keyOk(given: string | null): boolean {
  const expected = process.env.STATS_KEY;
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!keyOk(new URL(request.url).searchParams.get("key"))) {
    return new Response("Not found", { status: 404 });
  }
  throw new Error("NyotaNow Sentry probe: this error is deliberate");
}
