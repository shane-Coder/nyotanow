import { findInvite, toInviteData } from "@/db/queries";
import { buildIcs } from "@/lib/ics";
import { siteUrl } from "@/lib/invite";

// Reads live data: a host who edits the venue has to be able to hand out the
// same link again and have it carry the new one.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await findInvite(slug);
  if (!row) return new Response("Not found", { status: 404 });

  // Seconds since the invite was made. Zero until the first edit, and rising
  // after each one, which is all SEQUENCE has to be: a number a calendar can
  // compare against the copy it already holds.
  const sequence = Math.max(0, Math.floor((row.updatedAt.getTime() - row.createdAt.getTime()) / 1000));

  const body = buildIcs(toInviteData(row), {
    url: `${siteUrl()}/i/${slug}`,
    // The slug, so every copy of this invitation is the same event forever.
    uid: `${slug}@nyotanow.in`,
    sequence,
  });

  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}.ics"`,
      // The host can edit at any time, so a cached copy is a wrong copy.
      "cache-control": "no-store",
    },
  });
}
