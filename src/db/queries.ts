import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { InviteData } from "@/lib/invite";
import { slugBase } from "@/lib/invite";
import { getDb } from ".";
import { invites, rsvps, type InviteRow, type RsvpRow } from "./schema";

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
    message: row.message,
  } as InviteData;
}

export async function insertInvite(data: InviteData, source = ""): Promise<{ slug: string; key: string }> {
  const db = await getDb();
  const key = secret();
  const base = slugBase(data.title, data.occasion);
  // A 5-char suffix gives ~28M combinations per base; retry on the rare clash.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${suffix()}`;
    const inserted = await db
      .insert(invites)
      .values({ ...toColumns(data), slug, source, editKeyHash: hashKey(key) })
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

export async function recordView(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(invites)
    .set({ viewCount: sql`${invites.viewCount} + 1` })
    .where(eq(invites.id, id));
}

/** Inserts an RSVP, or overwrites the guest's earlier one when they change their answer. */
export async function saveRsvp(
  inviteId: string,
  r: Pick<RsvpRow, "name" | "status" | "guests" | "note">,
  replaces?: string,
): Promise<string> {
  const db = await getDb();
  const values = { ...r, guests: r.status === "no" ? 1 : r.guests };
  if (replaces && /^[0-9a-f-]{36}$/.test(replaces)) {
    const updated = await db
      .update(rsvps)
      .set({ ...values, createdAt: sql`now()` })
      .where(and(eq(rsvps.id, replaces), eq(rsvps.inviteId, inviteId)))
      .returning({ id: rsvps.id });
    if (updated[0]) return updated[0].id;
  }
  const [row] = await db.insert(rsvps).values({ inviteId, ...values }).returning({ id: rsvps.id });
  return row.id;
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
  invitesFromInvites: number;
  rsvps: number;
  guestsComing: number;
  views: number;
  invitesWithRsvps: number;
  last7: number;
  prev7: number;
  daily: { day: string; invites: number; rsvps: number }[];
  byOccasion: { occasion: string; count: number }[];
  byLang: { lang: string; count: number }[];
  byStatus: { status: string; count: number }[];
  recent: { slug: string; title: string; occasion: string; source: string; views: number; rsvps: number; createdAt: Date }[];
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
  }>(
    await db.execute(sql`
      SELECT count(*)::int AS invites,
             count(*) FILTER (WHERE source = 'invite')::int AS invites_from_invites,
             coalesce(sum(view_count), 0)::int AS views,
             count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last7,
             count(*) FILTER (WHERE created_at >= now() - interval '14 days'
                                AND created_at <  now() - interval '7 days')::int AS prev7
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
    views: number;
    rsvps: number;
    created_at: string | Date;
  }>(
    await db.execute(sql`
      SELECT i.slug, i.title, i.occasion, i.source, i.view_count::int AS views,
             (SELECT count(*)::int FROM rsvps s WHERE s.invite_id = i.id) AS rsvps,
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
    daily: daily.map((d) => ({ day: d.day, invites: Number(d.invites), rsvps: Number(d.rsvps) })),
    byOccasion: byOccasion.map((o) => ({ occasion: o.occasion, count: Number(o.count) })),
    byLang: byLang.map((l) => ({ lang: l.lang, count: Number(l.count) })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    recent: recent.map((x) => ({
      slug: x.slug,
      title: x.title,
      occasion: x.occasion,
      source: x.source,
      views: Number(x.views),
      rsvps: Number(x.rsvps),
      createdAt: new Date(x.created_at),
    })),
  };
}
