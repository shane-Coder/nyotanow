import { NextResponse } from "next/server";
import { recordFooterClick } from "@/db/queries";
import { ctaPlacement } from "@/lib/invite";
import { rateLimited } from "@/lib/rate-limit";

/**
 * The invite footer's "create your own" link.
 *
 * Counting the tap here, on the server, is the whole point: the localStorage
 * label cannot follow a guest who taps inside WhatsApp's browser and comes
 * back days later in Chrome, which is the likeliest journey there is. That gap
 * is why "from an invite" could read 0% whether the loop was being ignored or
 * simply could not be measured.
 *
 * Still redirects to /?ref=invite, so a guest who does finish in the same
 * browser is attributed exactly as before.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from") ?? "";
  // Anything unrecognised is stored as "", so a hand-edited ?at= cannot invent
  // a placement that the stats page would then report as real.
  const at = ctaPlacement(params.get("at"));

  try {
    // Counting must never be the reason a guest fails to reach the homepage.
    if (!(await rateLimited("footer"))) await recordFooterClick(from, at);
  } catch (err) {
    console.error("footer click not recorded", err);
  }

  return NextResponse.redirect(new URL("/?ref=invite", request.url));
}
