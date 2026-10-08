import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Takes secrets out of anything on its way to Sentry.
 *
 * sendDefaultPii: false keeps IPs, cookies and headers out, but it does not
 * touch the request URL — and two of ours carry a secret in the query string.
 * A host's manage link is the permanent key to their invite and their guest
 * list, and /stats/unlock carries the key to the whole dashboard. One error
 * thrown on either page would have filed that key in Sentry, where it would
 * sit in the event for as long as the event is kept.
 *
 * Applied to every string field we can reach rather than only the obvious
 * one, because a URL turns up in the request, in breadcrumbs, and inside
 * stack frames, and it only has to survive in one of them.
 */
const SECRET_PARAMS = ["key"];

/** The same URL with any secret query parameter replaced by a marker. */
export function scrubUrl(raw: string): string {
  if (!raw.includes("?")) return raw;
  try {
    // A base, because request URLs reach us as paths as often as full URLs.
    const url = new URL(raw, "https://nyotanow.in");
    let touched = false;
    for (const p of SECRET_PARAMS) {
      if (url.searchParams.has(p)) {
        url.searchParams.set(p, "[redacted]");
        touched = true;
      }
    }
    if (!touched) return raw;
    return raw.startsWith("http") ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Unparseable: strip the query rather than risk sending it.
    return `${raw.split("?")[0]}?[redacted]`;
  }
}

/** Walks an event and rewrites every string through scrubUrl. */
function deepScrub(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;
  if (typeof value === "string") return scrubUrl(value);
  if (Array.isArray(value)) return value.map((v) => deepScrub(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepScrub(v, depth + 1);
    return out;
  }
  return value;
}

export function scrubSecrets(event: ErrorEvent): ErrorEvent {
  return deepScrub(event) as ErrorEvent;
}
