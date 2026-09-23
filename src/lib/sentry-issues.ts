/**
 * Reads unresolved issues from Sentry so the private /stats page can show
 * "is anything broken?" next to "is anyone using it?".
 *
 * Deliberately fails soft in every direction: /stats is the only dashboard
 * this project has, and a missing token or a slow Sentry must never be the
 * reason it won't load.
 */

export type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  /** Where it happened, e.g. "GET /api/sentry-probe". */
  culprit: string;
  count: number;
  userCount: number;
  lastSeen: string;
  level: string;
  permalink: string;
};

export type SentryFeed =
  | { state: "off" }
  | { state: "error"; message: string }
  | { state: "ok"; issues: SentryIssue[] };

/** Narrows one raw API object, tolerating fields Sentry may rename or omit. */
export function toIssue(raw: unknown): SentryIssue | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) return null;
  return {
    id,
    shortId: typeof r.shortId === "string" ? r.shortId : "",
    title: typeof r.title === "string" ? r.title : "Unknown error",
    culprit: typeof r.culprit === "string" ? r.culprit : "",
    // Sentry sends these as strings.
    count: Number(r.count ?? 0) || 0,
    userCount: Number(r.userCount ?? 0) || 0,
    lastSeen: typeof r.lastSeen === "string" ? r.lastSeen : "",
    level: typeof r.level === "string" ? r.level : "error",
    permalink: typeof r.permalink === "string" ? r.permalink : "",
  };
}

/** "3m", "5h", "2d" — compact enough for a dense table. */
export function agoLabel(iso: string, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((now.getTime() - then) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / (60 * 24))}d`;
}

export async function fetchSentryIssues(limit = 8): Promise<SentryFeed> {
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!org || !project || !token) return { state: "off" };

  const url =
    `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/` +
    `?query=${encodeURIComponent("is:unresolved")}&statsPeriod=14d&limit=${limit}&sort=date`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      // One call a minute at most, however often the page is refreshed.
      next: { revalidate: 60 },
      // Sentry being slow must not hold the whole page hostage.
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const hint =
        res.status === 401 || res.status === 403
          ? "token rejected — check it has the event:read scope"
          : res.status === 404
            ? "project not found — check SENTRY_ORG and SENTRY_PROJECT"
            : `HTTP ${res.status}`;
      return { state: "error", message: hint };
    }
    const body: unknown = await res.json();
    if (!Array.isArray(body)) return { state: "error", message: "unexpected response shape" };
    return { state: "ok", issues: body.map(toIssue).filter((i): i is SentryIssue => i !== null) };
  } catch (err) {
    const message = err instanceof Error && err.name === "TimeoutError" ? "Sentry timed out" : "could not reach Sentry";
    console.error("sentry issues fetch failed", err);
    return { state: "error", message };
  }
}
