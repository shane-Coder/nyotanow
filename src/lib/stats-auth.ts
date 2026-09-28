import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Access to the private /stats page.
 *
 * The key used to travel in the URL on every visit, which put it in browser
 * history, in request logs, and one screenshot away from being public. It is
 * now exchanged once for a cookie.
 */

export const STATS_COOKIE = "nyota_stats";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function sameSecret(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** True when the ?key= given matches STATS_KEY. */
export function keyOk(given: string | undefined | null): boolean {
  const expected = process.env.STATS_KEY;
  // No key configured means the page stays closed, not open to everyone.
  if (!expected || !given) return false;
  return sameSecret(sha256(given), sha256(expected));
}

/**
 * What the cookie holds: a digest of the key, never the key itself, so a
 * stolen cookie cannot simply be pasted back into ?key= — and rotating
 * STATS_KEY invalidates every existing cookie for free.
 */
export function cookieValue(): string | null {
  const expected = process.env.STATS_KEY;
  return expected ? sha256(expected).toString("hex") : null;
}

/** True when the cookie presented matches the current STATS_KEY. */
export function cookieOk(given: string | undefined | null): boolean {
  const expected = cookieValue();
  if (!expected || !given) return false;
  return sameSecret(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}
