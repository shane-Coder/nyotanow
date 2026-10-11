import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { clearExpiredGuestLists } from "@/db/queries";
import { RETENTION_MONTHS } from "@/lib/retention";

/**
 * The retention job: deletes the guest list of every event that finished more
 * than RETENTION_MONTHS ago and leaves the invitation standing.
 *
 * Run by Vercel Cron once a day (see vercel.json), which arrives as an
 * ordinary GET carrying `Authorization: Bearer $CRON_SECRET`. The schedule is
 * 02:10 UTC — 07:40 in India, past the quietest hour and before anybody is
 * making invitations, so a slow run never overlaps real traffic.
 *
 * Built and verified before the privacy page promised anything, which was the
 * whole point of doing it in this order: a policy that says names are deleted
 * after three months, backed by nothing that deletes them, is worse than
 * having no policy — it is a written claim that is not true.
 */

export const dynamic = "force-dynamic";
// Deleting across a table should not be cut off halfway by a 10s default.
export const maxDuration = 60;

/**
 * True when the caller proved it is Vercel Cron.
 *
 * Fails closed when CRON_SECRET is unset. The alternative — running for
 * anyone who finds the path — would let a stranger bring the schedule
 * forward, and this endpoint's whole job is deleting people's data. A
 * deployment with no secret configured therefore does nothing at all, loudly.
 */
function authorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const given = request.headers.get("authorization");
  if (!expected || !given) return false;
  // Digest both sides first: timingSafeEqual needs equal lengths, and the
  // length of the header would otherwise be readable from the failure.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(`Bearer ${expected}`).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    // 404 rather than 401: an unauthenticated caller learns nothing about
    // whether this path exists, which is how /stats behaves too.
    return new NextResponse(null, { status: 404 });
  }

  try {
    const cleared = await clearExpiredGuestLists();
    // Logged even when it clears nothing, so the Vercel log shows the job ran
    // rather than leaving "no output" to mean both success and silence.
    console.log(`retention: cleared ${cleared.replies} replies from ${cleared.invites} invites`);
    return NextResponse.json({ ok: true, retentionMonths: RETENTION_MONTHS, ...cleared });
  } catch (err) {
    console.error("retention job failed", err);
    // 500 so the run shows as failed in Vercel rather than passing quietly;
    // the next day's run picks up exactly the same rows.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
