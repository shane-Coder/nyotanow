import { headers } from "next/headers";
import { hitRateLimit, pruneRateLimits } from "@/db/queries";

/**
 * Caps are deliberately generous. Indian mobile networks put many households
 * behind a single CGNAT address, so a limit tight enough to stop a determined
 * script would also lock out real families sharing a carrier IP. The goal here
 * is to keep one bored person with a loop from drowning the stats, not to be
 * airtight.
 */
const LIMITS = {
  create: [
    { seconds: 60 * 60, max: 10 },
    { seconds: 60 * 60 * 24, max: 30 },
  ],
  rsvp: [{ seconds: 60 * 60, max: 30 }],
} satisfies Record<string, { seconds: number; max: number }[]>;

const MESSAGES: Record<Bucket, string> = {
  create: "You've created a lot of invites just now. Please try again in a little while.",
  rsvp: "That's a lot of replies from this device. Please try again in a little while.",
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
