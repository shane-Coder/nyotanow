import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { InviteData } from "@/lib/invite";
import { slugBase } from "@/lib/invite";
import { getDb } from ".";
import { footerClicks, invites, rsvps, type InviteRow, type RsvpRow } from "./schema";

const suffix = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 5);
const secret = customAlphabet("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 24);

/**
 * postgres-js returns rows as a plain array, PGlite wraps them in `{ rows }`.
 * Everything that uses db.execute goes through this.
 */
function rows<T>(r: { rows?: T[] } | T[]): T[] {
  return Array.isArray(r) ? r : (r.rows ?? []);
}

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function keyMatches(invite: InviteRow, key: string | undefined | null): boolean {
  if (!key) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(invite.editKeyHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function toColumns(data: InviteData) {
  return {
    occasion: data.occasion,
    template: data.template,
    palette: data.palette,
    lang: data.lang,
    kicker: data.kicker,
    title: data.title,
    hostedBy: data.hostedBy,
    eventDate: data.date,
    eventTime: data.time,
    venue: data.venue,
    address: data.address,
    placeLat: data.placeLat,
    placeLng: data.placeLng,
    message: data.message,
  };
}

export function toInviteData(row: InviteRow): InviteData {
  return {
    occasion: row.occasion,
    template: row.template,
    palette: row.palette,
    lang: row.lang,
    kicker: row.kicker,
    title: row.title,
    hostedBy: row.hostedBy,
    date: row.eventDate,
    time: row.eventTime,
    venue: row.venue,
    address: row.address,
    placeLat: row.placeLat,
    placeLng: row.placeLng,
    message: row.message,
  } as InviteData;
}

export async function insertInvite(data: InviteData, source = "", mine = false): Promise<{ slug: string; key: string }> {
  const db = await getDb();
  const key = secret();
  const base = slugBase(data.title, data.occasion);
  // A 5-char suffix gives ~28M combinations per base; retry on the rare clash.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${suffix()}`;
    const inserted = await db
      .insert(invites)
      .values({ ...toColumns(data), slug, source, mine, editKeyHash: hashKey(key) })
      .onConflictDoNothing({ target: invites.slug })
      .returning({ slug: invites.slug });
    if (inserted.length) return { slug, key };
  }
  throw new Error("Could not allocate a unique invite link");
}

export async function updateInvite(id: string, data: InviteData): Promise<void> {
  const db = await getDb();
  await db
    .update(invites)
    .set({ ...toColumns(data), updatedAt: sql`now()` })
    .where(eq(invites.id, id));
}

export async function findInvite(slug: string): Promise<InviteRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(invites).where(eq(invites.slug, slug)).limit(1);
  return row;
}

/**
 * Bumps the host's per-invite counter and writes a timestamped event, in one
 * statement. The counter answers "how many views has this invite had"; the
 * event answers "how many views this week", which the counter never could.
 */
export async function recordView(id: string, mine = false): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    WITH bump AS (
      UPDATE invites SET view_count = view_count + 1 WHERE id = ${id}
    )
    INSERT INTO invite_views (invite_id, mine) VALUES (${id}, ${mine})
  `);
}

/** Inserts an RSVP, or overwrites the guest's earlier one when they change their answer. */
/**
 * Records a guest's answer, replacing their earlier one if they have already
 * replied to this invite.
 *
 * Matched on the name they typed, not on an id the page hands back. The id
 * version had two faults. A guest who replied on their phone and opened the
 * link again on a laptop had no id there, so they appeared twice and the
 * host's headcount was wrong — which was certain to happen rather than merely
 * possible. And the id arrived in a hidden form field, so anything that
 * learned another guest's id could overwrite their reply.
 *
 * The trade-off is real and worth naming: two different guests who type the
 * same name on one invite become one entry. Invitations go to a known circle
 * rather than the public, so that is rarer than the duplicates it prevents,
 * and a host can see and fix one merged row — they cannot see a headcount
 * that was quietly double-counted.
 */
export async function saveRsvp(
  inviteId: string,
  r: Pick<RsvpRow, "name" | "status" | "guests" | "note">,
): Promise<string> {
  const db = await getDb();
  const values = { ...r, guests: r.status === "no" ? 1 : r.guests };

  const updated = await db
    .update(rsvps)
    .set({ ...values, createdAt: sql`now()` })
    .where(and(eq(rsvps.inviteId, inviteId), sql`lower(btrim(${rsvps.name})) = lower(btrim(${r.name}))`))
    .returning({ id: rsvps.id });
  if (updated[0]) return updated[0].id;

  const [row] = await db.insert(rsvps).values({ inviteId, ...values }).returning({ id: rsvps.id });
  return row.id;
}

/** Removes an invite and, by cascade, every reply to it. Not recoverable. */
export async function deleteInvite(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(invites).where(eq(invites.id, id));
}

export async function listRsvps(inviteId: string): Promise<RsvpRow[]> {
  const db = await getDb();
  return db.select().from(rsvps).where(eq(rsvps.inviteId, inviteId)).orderBy(desc(rsvps.createdAt));
}

/** Headcount of people who said yes, including the guests they're bringing. */
export async function comingCount(inviteId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${rsvps.guests}), 0)::int` })
    .from(rsvps)
    .where(and(eq(rsvps.inviteId, inviteId), eq(rsvps.status, "yes")));
  return Number(row?.total ?? 0);
}

/* ----------------------------- the loop ----------------------------- */

/** Records a guest tapping "create your own". Never blocks the redirect. */
export async function recordFooterClick(slug: string, placement = "", mine = false): Promise<void> {
  const db = await getDb();
  await db.insert(footerClicks).values({ slug: slug.slice(0, 80), placement, mine });
}

/* --------------------------- rate limiting --------------------------- */

/**
 * Counts one hit in the current fixed window and returns the running total,
 * so `total > max` means the caller is over the limit.
 *
 * The window boundary is computed by Postgres rather than by the app, so
 * instances with skewed clocks still agree on which window they are in. The
 * INSERT ... ON CONFLICT is a single atomic statement, so concurrent requests
 * cannot both read a stale count.
 */
export async function hitRateLimit(bucket: string, subject: string, windowSeconds: number): Promise<number> {
  const db = await getDb();
  const [row] = rows<{ hits: number }>(
    await db.execute(sql`
      INSERT INTO rate_limits (bucket, subject, window_start, hits)
      VALUES (
        ${bucket},
        ${subject},
        to_timestamp(floor(extract(epoch FROM now()) / ${windowSeconds}) * ${windowSeconds}),
        1
      )
      ON CONFLICT (bucket, subject, window_start) DO UPDATE SET hits = rate_limits.hits + 1
      RETURNING hits
    `),
  );
  return Number(row?.hits ?? 0);
}

/** Drops windows that can no longer be current. Cheap enough to run inline. */
export async function pruneRateLimits(): Promise<void> {
  const db = await getDb();
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
}

/* ------------------------------ stats ------------------------------ */

export type Stats = {
  invites: number;
  /** The operator's own, counted apart rather than mixed into everything above. */
  mine: number;
  invitesFromInvites: number;
  rsvps: number;
  guestsComing: number;
  views: number;
  invitesWithRsvps: number;
  /** Guests who tapped the invite footer. The step the old metric could not see. */
  footerClicks: number;
  /**
   * The same taps split by where on the page they came from, over the same 7
   * days as `loop7`. "" is every tap recorded before the two placements
   * existed, so it is shown as the old single footer rather than merged in.
   */
  tapsByPlacement: { placement: string; taps: number }[];
  /**
   * The loop over the last 7 days. Windowed because comparing lifetime views
   * with a few days of taps produced a rate that meant nothing.
   */
  loop7: { views: number; taps: number; created: number };
  last7: number;
  prev7: number;
  daily: { day: string; invites: number; rsvps: number }[];
  byOccasion: { occasion: string; count: number }[];
  byLang: { lang: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recent: {
    slug: string;
    title: string;
    occasion: string;
    source: string;
    mine: boolean;
    views: number;
    rsvps: number;
    yes: number;
    maybe: number;
    no: number;
    createdAt: Date;
  }[];
};

/** Everything the private /stats page shows, in one round trip per section. */
export async function getStats(): Promise<Stats> {
  const db = await getDb();

  const [totals] = rows<{
    invites: number;
    invites_from_invites: number;
    views: number;
    last7: number;
    prev7: number;
    mine: number;
  }>(
    await db.execute(sql`
      SELECT count(*) FILTER (WHERE NOT mine)::int AS invites,
             count(*) FILTER (WHERE source = 'invite' AND NOT mine)::int AS invites_from_invites,
             coalesce(sum(view_count) FILTER (WHERE NOT mine), 0)::int AS views,
             count(*) FILTER (WHERE created_at >= now() - interval '7 days' AND NOT mine)::int AS last7,
             count(*) FILTER (WHERE created_at >= now() - interval '14 days'
                                AND created_at <  now() - interval '7 days'
                                AND NOT mine)::int AS prev7,
             count(*) FILTER (WHERE mine)::int AS mine
      FROM invites
    `),
  );

  const [r] = rows<{ rsvps: number; guests_coming: number; invites_with_rsvps: number }>(
    await db.execute(sql`
      SELECT count(*)::int AS rsvps,
             coalesce(sum(guests) FILTER (WHERE status = 'yes'), 0)::int AS guests_coming,
             count(DISTINCT invite_id)::int AS invites_with_rsvps
      FROM rsvps
    `),
  );

  // Last 14 days, including days with nothing, so the chart has no gaps.
  const daily = rows<{ day: string; invites: number; rsvps: number }>(
    await db.execute(sql`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             (SELECT count(*)::int FROM invites i WHERE date_trunc('day', i.created_at) = d.day) AS invites,
             (SELECT count(*)::int FROM rsvps  s WHERE date_trunc('day', s.created_at) = d.day) AS rsvps
      FROM generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') AS d(day)
      ORDER BY d.day
    `),
  );

  const [fc] = rows<{ clicks: number }>(
    await db.execute(sql`SELECT count(*) FILTER (WHERE NOT mine)::int AS clicks FROM footer_clicks`),
  );

  // All three counted over the same window, or the percentages lie.
  const [loop] = rows<{ views: number; taps: number; created: number }>(
    await db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM invite_views  WHERE created_at >= now() - interval '7 days' AND NOT mine) AS views,
        (SELECT count(*)::int FROM footer_clicks WHERE created_at >= now() - interval '7 days' AND NOT mine) AS taps,
        (SELECT count(*)::int FROM invites
          WHERE source = 'invite' AND created_at >= now() - interval '7 days' AND NOT mine)              AS created
    `),
  );

  // Same 7-day window as loop7, so this breaks that one number down rather
  // than sitting beside it as a lifetime total that cannot be compared.
  const tapsByPlacement = rows<{ placement: string; taps: number }>(
    await db.execute(sql`
      SELECT placement, count(*)::int AS taps
      FROM footer_clicks
      WHERE created_at >= now() - interval '7 days' AND NOT mine
      GROUP BY placement
      ORDER BY taps DESC
    `),
  );

  const byOccasion = rows<{ occasion: string; count: number }>(
    await db.execute(sql`SELECT occasion, count(*)::int AS count FROM invites GROUP BY occasion ORDER BY count DESC`),
  );
  const byLang = rows<{ lang: string; count: number }>(
    await db.execute(sql`SELECT lang, count(*)::int AS count FROM invites GROUP BY lang ORDER BY count DESC`),
  );
  const byStatus = rows<{ status: string; count: number }>(
    await db.execute(sql`SELECT status, count(*)::int AS count FROM rsvps GROUP BY status ORDER BY count DESC`),
  );

  const recent = rows<{
    slug: string;
    title: string;
    occasion: string;
    source: string;
    mine: boolean;
    views: number;
    rsvps: number;
    yes: number;
    maybe: number;
    no: number;
    created_at: string | Date;
  }>(
    await db.execute(sql`
      SELECT i.slug, i.title, i.occasion, i.source, i.mine, i.view_count::int AS views,
             (SELECT count(*)::int FROM rsvps s WHERE s.invite_id = i.id) AS rsvps,
             -- Counts, never names. The guest list belongs to the host; this
             -- page only needs to know whether anyone answered and how.
             (SELECT count(*)::int FROM rsvps s WHERE s.invite_id = i.id AND s.status = 'yes')   AS yes,
             (SELECT count(*)::int FROM rsvps s WHERE s.invite_id = i.id AND s.status = 'maybe') AS maybe,
             (SELECT count(*)::int FROM rsvps s WHERE s.invite_id = i.id AND s.status = 'no')    AS no,
             i.created_at
      FROM invites i
      ORDER BY i.created_at DESC
      LIMIT 15
    `),
  );

  return {
    invites: Number(totals?.invites ?? 0),
    invitesFromInvites: Number(totals?.invites_from_invites ?? 0),
    views: Number(totals?.views ?? 0),
    last7: Number(totals?.last7 ?? 0),
    prev7: Number(totals?.prev7 ?? 0),
    rsvps: Number(r?.rsvps ?? 0),
    guestsComing: Number(r?.guests_coming ?? 0),
    invitesWithRsvps: Number(r?.invites_with_rsvps ?? 0),
    mine: Number(totals?.mine ?? 0),
    footerClicks: Number(fc?.clicks ?? 0),
    tapsByPlacement: tapsByPlacement.map((p) => ({ placement: p.placement, taps: Number(p.taps) })),
    loop7: {
      views: Number(loop?.views ?? 0),
      taps: Number(loop?.taps ?? 0),
      created: Number(loop?.created ?? 0),
    },
    daily: daily.map((d) => ({ day: d.day, invites: Number(d.invites), rsvps: Number(d.rsvps) })),
    byOccasion: byOccasion.map((o) => ({ occasion: o.occasion, count: Number(o.count) })),
    byLang: byLang.map((l) => ({ lang: l.lang, count: Number(l.count) })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    recent: recent.map((x) => ({
      slug: x.slug,
      title: x.title,
      occasion: x.occasion,
      source: x.source,
      mine: Boolean(x.mine),
      views: Number(x.views),
      rsvps: Number(x.rsvps),
      yes: Number(x.yes),
      maybe: Number(x.maybe),
      no: Number(x.no),
      createdAt: new Date(x.created_at),
    })),
  };
}
