import { headers } from "next/headers";
import { hitRateLimit, pruneRateLimits } from "@/db/queries";

/**
 * Caps are deliberately generous. Indian mobile networks put many households
 * behind a single CGNAT address, so a limit tight enough to stop a determined
 * script would also lock out real families sharing a carrier IP. The goal here
 * is to keep one bored person with a loop from drowning the stats, not to be
 * airtight.
 *
 * Raised for a campaign: a burst of arrivals from one Instagram post can put
 * dozens of genuine hosts behind the same carrier address within an hour, and
 * being told "you have created a lot of invites" on your first one is a far
 * worse outcome than a few junk rows.
 */
const LIMITS = {
  create: [
    { seconds: 60 * 60, max: 30 },
    { seconds: 60 * 60 * 24, max: 100 },
  ],
  rsvp: [{ seconds: 60 * 60, max: 60 }],
  // Footer taps. Only here to stop one device inflating the loop numbers.
  footer: [{ seconds: 60 * 60, max: 60 }],
  // Guessing the /stats key. Generous for the one person who owns it,
  // pointless for anyone brute-forcing 24 random characters.
  stats: [{ seconds: 60 * 60, max: 30 }],
  // Venue suggestions. The only path here that can cost real money, so this
  // one is tight on purpose. A host filling in a venue sends a handful of
  // debounced requests; 120 an hour is many invites' worth and still far
  // under the provider's free allowance even if somebody points a script at
  // it. The daily cap is the one that actually bounds a bad day.
  places: [
    { seconds: 60 * 60, max: 120 },
    { seconds: 60 * 60 * 24, max: 600 },
  ],
} satisfies Record<string, { seconds: number; max: number }[]>;

/**
 * Caps that apply to the whole site at once rather than to one caller.
 *
 * The per-IP limits above cannot see a distributed attack. A hundred
 * addresses each staying politely under 600 a day is 60,000 calls, and every
 * one of them passes the per-caller check. That is fine for the buckets whose
 * worst case is junk rows, and not fine for the one whose worst case is a
 * bill.
 *
 * 2,000 a day is roughly 60,000 a month against a free allowance of 100,000,
 * and about 500 invites a day at the four-or-so calls each one costs — far
 * beyond anything this site has seen. Raise it the day that stops being true;
 * being told there are no suggestions is a small thing, and far better than
 * the alternative.
 */
const GLOBAL_LIMITS = {
  places: [{ seconds: 60 * 60 * 24, max: 2000 }],
} satisfies Partial<Record<Bucket, { seconds: number; max: number }[]>>;

export type GlobalBucket = keyof typeof GLOBAL_LIMITS;

/**
 * True when the site as a whole has had enough of this for today.
 *
 * Note this fails *closed*, unlike everything else in this file. The others
 * protect against nuisance, so a limiter that is down must not take the site
 * with it. This one protects against spending money, and the failure it
 * causes is a venue box without suggestions — which is what the box was until
 * recently and is no loss at all.
 */
export async function overGlobalCap(bucket: GlobalBucket): Promise<boolean> {
  try {
    for (const { seconds, max } of GLOBAL_LIMITS[bucket]) {
      if ((await hitRateLimit(`${bucket}:all`, "all", seconds)) > max) return true;
    }
    return false;
  } catch (err) {
    console.error("global cap check failed", err);
    return true;
  }
}

const MESSAGES: Record<Bucket, string> = {
  create: "You've created a lot of invites just now. Please try again in a little while.",
  rsvp: "That's a lot of replies from this device. Please try again in a little while.",
  // Never shown: the stats page 404s rather than explaining itself.
  stats: "Too many attempts.",
  // Never shown: the redirect happens either way, the click just is not counted.
  footer: "Counted enough from here.",
  // Never shown: suggestions just stop arriving and the host keeps typing.
  places: "Enough lookups from here for now.",
};

export type Bucket = keyof typeof LIMITS;

/** The caller's IP, or null when we shouldn't be limiting at all. */
async function caller(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  if (ip) return ip;
  // No proxy headers means local development, where throttling yourself while
  // testing is pure friction. Vercel always sets x-forwarded-for in production,
  // so falling back to one shared bucket there is the safe side to err on.
  return process.env.VERCEL ? "unknown" : null;
}

/**
 * Records an attempt and returns a message to show the user when they have
 * done this too often, or null when they're fine.
 *
 * Call this *after* validation passes, so someone hammering the form with
 * invalid data can't use up a real host's allowance.
 */
export async function rateLimited(bucket: Bucket, scope?: string): Promise<string | null> {
  const who = await caller();
  if (!who) return null;
  const subject = scope ? `${who}|${scope}` : who;

  try {
    for (const { seconds, max } of LIMITS[bucket]) {
      const hits = await hitRateLimit(bucket, subject, seconds);
      if (hits > max) return MESSAGES[bucket];
      // Roughly once every 200 requests, clear out windows that have expired.
      if (Math.random() < 0.005) await pruneRateLimits();
    }
  } catch (err) {
    // A limiter that is down must not take the site down with it.
    console.error("rate limit check failed", err);
    return null;
  }
  return null;
}
