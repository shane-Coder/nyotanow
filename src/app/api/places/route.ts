import { NextResponse } from "next/server";
import { MIN_QUERY, searchPlaces } from "@/lib/places";
import { overGlobalCap, rateLimited } from "@/lib/rate-limit";

/**
 * Venue suggestions for the create form.
 *
 * Proxied rather than called from the browser so the key stays on the server.
 * A browser-side key is only ever protected by an HTTP referrer restriction,
 * which is trivially spoofed and routinely scraped out of page source — and
 * unlike every other write path here, each request to this one can cost money.
 *
 * That is also why it gets its own, tighter bucket: the existing limits are
 * generous because Indian carriers put whole neighbourhoods behind one
 * address, but generous means something different when the downside is a bill
 * rather than a junk row.
 */

export const dynamic = "force-dynamic";

/**
 * True when the request did not come from a page of ours.
 *
 * Browsers send Origin on cross-site fetches, so a lookup embedded in someone
 * else's site arrives stamped with their origin and is turned away. It spends
 * a quota that costs money beyond the free tier, and there is no reason for
 * any site but this one to be asking.
 *
 * Absent Origin is allowed: same-origin GETs from older browsers, and curl,
 * send none. That is deliberate — this only has to stop a page on another
 * domain quietly using the key, which the rate limits then bound anyway.
 */
function foreign(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

export async function GET(request: Request) {
  if (foreign(request)) return NextResponse.json([], { status: 403 });

  const q = new URL(request.url).searchParams.get("q") ?? "";
  // Checked before the limiter so a short query, which the browser should not
  // have sent anyway, cannot spend a real host's allowance.
  if (q.trim().length < MIN_QUERY) return NextResponse.json([]);

  // Per-caller first, so requests we are already refusing do not eat into the
  // allowance the rest of the site shares.
  if (await rateLimited("places")) return NextResponse.json([]);
  if (await overGlobalCap("places")) return NextResponse.json([]);

  const suggestions = await searchPlaces(q);
  return NextResponse.json(suggestions, {
    // Private: this is one person's half-typed venue, not a shared resource.
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
