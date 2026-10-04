/**
 * Map links that hosts paste into the venue or address box.
 *
 * People do this constantly: they long-press their house in Google Maps, hit
 * share, and paste what they get. Until now that produced the worst of both
 * worlds — a raw URL printed across an otherwise handsome invitation card,
 * and a Directions button that searched Google for the literal string
 * "China, https://share.google/Sbi9kwLonhxU18GED" and found nothing.
 *
 * The host's meaning is obvious, so honour it: send Directions to the link
 * they pasted, and keep the URL off the card.
 *
 * ── Why this is an allowlist and not "any URL" ──────────────────────────
 * Anyone can make an invite here, invites get forwarded around WhatsApp
 * inside families, and every one of them carries "Made with NyotaNow" as a
 * reason to trust it. Turning arbitrary pasted text into a link a guest taps
 * would make this product a delivery vehicle for someone else's phishing
 * page. A URL we do not recognise stays exactly what it is today: inert text.
 *
 * Note which hosts need their path checked. google.com serves far more than
 * maps and runs open redirectors like /url?q=, so "the host is Google" is not
 * on its own a reason to send a guest there.
 */

/** Hosts that serve nothing but maps, so the path does not matter. */
const MAP_ONLY_HOSTS = new Set([
  "share.google",
  "maps.app.goo.gl",
  "maps.apple.com",
  "openstreetmap.org",
  "osm.org",
  "mappls.com",
  "olamaps.io",
]);

/** google.com, google.co.in, and the rest of the country domains. */
const GOOGLE_HOST = /^google(\.[a-z]{2,3}){1,2}$/;
const GOOGLE_MAPS_HOST = /^maps\.google(\.[a-z]{2,3}){1,2}$/;

function isMapUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  // No http: a guest should not be sent somewhere a network can rewrite.
  if (url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (MAP_ONLY_HOSTS.has(host)) return true;
  if (GOOGLE_MAPS_HOST.test(host)) return true;

  // Everything below shares a host with plenty that is not a map.
  const path = url.pathname.toLowerCase();
  const maps = path === "/maps" || path.startsWith("/maps/");
  if (GOOGLE_HOST.test(host) && maps) return true;
  if ((host === "goo.gl" || host === "bing.com") && maps) return true;
  return false;
}

// Trailing brackets and sentence punctuation are far more likely to be the
// host's than part of the URL they pasted.
const URL_PATTERN = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/gi;

/**
 * The first recognised map link in the text, or null.
 *
 * Null covers every ordinary case — no link at all, and a link to something
 * that is not a map — and both mean "carry on as before".
 */
export function mapLinkIn(...parts: (string | null | undefined)[]): string | null {
  for (const part of parts) {
    for (const match of (part ?? "").match(URL_PATTERN) ?? []) {
      if (isMapUrl(match)) return match;
    }
  }
  return null;
}

/**
 * The text with any recognised map link taken out, for printing on the card.
 *
 * Only ever removes a link we are about to honour elsewhere, so nothing the
 * host wrote disappears without the Directions button gaining it. A URL we do
 * not recognise is left alone: it is their words, and silently deleting a
 * guest's only clue to the venue would be worse than printing it.
 */
export function withoutMapLink(text: string): string {
  if (!text) return text;
  const cleaned = text.replace(URL_PATTERN, (m) => (isMapUrl(m) ? "" : m));
  // A line that was only a link leaves behind the comma that joined it.
  return cleaned.replace(/\s{2,}/g, " ").replace(/^[\s,;·|–-]+|[\s,;·|–-]+$/g, "");
}
