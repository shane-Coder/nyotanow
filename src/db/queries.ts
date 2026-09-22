import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { InviteData } from "@/lib/invite";
import { slugBase } from "@/lib/invite";
import { getDb } from ".";
import { invites, rsvps, type InviteRow, type RsvpRow } from "./schema";

const suffix = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 5);
const secret = customAlphabet("abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789", 24);

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

export async function insertInvite(data: InviteData): Promise<{ slug: string; key: string }> {
  const db = await getDb();
  const key = secret();
  const base = slugBase(data.title, data.occasion);
  // A 5-char suffix gives ~28M combinations per base; retry on the rare clash.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${base}-${suffix()}`;
    const inserted = await db
      .insert(invites)
      .values({ ...toColumns(data), slug, editKeyHash: hashKey(key) })
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
