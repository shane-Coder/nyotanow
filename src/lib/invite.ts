import { z } from "zod";
import { mapLinkIn, withoutMapLink } from "./map-link";
import { OCCASION_IDS } from "./occasions";
import { LANGS, PALETTE_IDS, TEMPLATE_IDS, type Lang } from "./themes";

/** Every event is in India for now, so all dates are interpreted as IST. */
export const EVENT_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

export const inviteSchema = z.object({
  occasion: z.enum(OCCASION_IDS),
  template: z.enum(TEMPLATE_IDS),
  palette: z.enum(PALETTE_IDS),
  lang: z.enum(LANGS),
  kicker: z.string().trim().max(60),
  title: z.string().trim().min(2, "Give your event a name").max(80, "Keep the name under 80 characters"),
  hostedBy: z.string().trim().max(80),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.union([z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time"), z.literal("")]),
  venue: z.string().trim().min(2, "Where is it happening?").max(120),
  address: z.string().trim().max(240),
  // Present only when the host picked the venue from the suggestions. Comes
  // from a hidden field, so it is range-checked rather than trusted, and
  // anything odd becomes null instead of failing the whole submission — a
  // host must never be blocked from creating an invite by a coordinate.
  placeLat: z.coerce.number().min(-90).max(90).nullish().catch(null),
  placeLng: z.coerce.number().min(-180).max(180).nullish().catch(null),
  message: z.string().trim().max(400, "Keep the message under 400 characters"),
});

export type InviteData = z.infer<typeof inviteSchema>;

export const rsvpSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(60),
  status: z.enum(["yes", "maybe", "no"]),
  guests: z.coerce.number().int().min(1).max(20),
  note: z.string().trim().max(300),
});

export type RsvpStatus = z.infer<typeof rsvpSchema>["status"];

export function eventStart(date: string, time: string): Date {
  return new Date(`${date}T${time || "00:00"}:00${IST_OFFSET}`);
}

/** Today's date in India as YYYY-MM-DD, comparable with invite dates as plain strings. */
export function todayInIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_TZ }).format(now);
}

/** The current time in India as "HH:MM", comparable with invite times as plain strings. */
export function timeNowInIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: EVENT_TZ,
  }).format(now);
}

/**
 * True when an event's start has already gone by, comparing plain strings so
 * the client needs no timezone maths of its own.
 *
 * An empty date means the host hasn't picked one yet, not that it's past. An
 * event today with no time set is still ahead of us, because it could be
 * happening this evening.
 */
export function isPastEventAt(date: string, time: string, nowDate: string, nowTime: string): boolean {
  if (!date) return false;
  if (date < nowDate) return true;
  if (date > nowDate) return false;
  return time !== "" && time < nowTime;
}

/**
 * Moves a past date/time forward to the earliest moment still available.
 *
 * Needed because WebKit ignores min= on date and time inputs, so on iPhone and
 * iPad nothing is greyed out and a host can pick this morning. Rather than let
 * them find out when the server refuses it, the field corrects itself.
 */
/**
 * How far ahead an event may be.
 *
 * We blocked the past with some care and never thought about the other
 * direction, so a typed year sailed through: a real invite went out for 7 July
 * 8978, with a countdown reading two and a half million days. Any four-digit
 * year matched the pattern.
 *
 * Five years is far more than anyone books. A wedding two years out, a
 * milestone anniversary planned early — all fine; a slipped keystroke is not.
 */
export const MAX_YEARS_AHEAD = 5;

/** The latest date a host may pick, as YYYY-MM-DD. */
export function maxEventDate(nowDate: string): string {
  const year = Number(nowDate.slice(0, 4));
  return Number.isFinite(year) ? `${year + MAX_YEARS_AHEAD}${nowDate.slice(4)}` : nowDate;
}

/** True when the date is further ahead than we are willing to accept. */
export function isTooFarAhead(date: string, nowDate: string): boolean {
  if (!date) return false;
  return date > maxEventDate(nowDate);
}

/**
 * Moves a date/time that has gone forward to the earliest moment still
 * available, and one that is implausibly far ahead back to the latest allowed.
 *
 * Needed because WebKit ignores min= and max= on date inputs, so on iPhone and
 * iPad nothing is greyed out and a host can pick this morning — or the year
 * 8978. Rather than let them find out when the server refuses it, the field
 * corrects itself.
 */
export function clampToFuture(
  date: string,
  time: string,
  nowDate: string,
  nowTime: string,
): { date: string; time: string } {
  if (!date) return { date, time };
  if (date < nowDate) {
    // The day moves to today, which can strand a time earlier than right now.
    return { date: nowDate, time: time !== "" && time < nowTime ? nowTime : time };
  }
  if (isTooFarAhead(date, nowDate)) return { date: maxEventDate(nowDate), time };
  if (date === nowDate && time !== "" && time < nowTime) return { date, time: nowTime };
  return { date, time };
}

/** isPastEventAt against the clock, for the server. */
export function isPastEvent(date: string, time: string, now: Date = new Date()): boolean {
  return isPastEventAt(date, time, todayInIST(now), timeNowInIST(now));
}

export function formatEventDate(date: string, lang: Lang): string {
  if (!date) return "";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: EVENT_TZ,
  }).format(eventStart(date, "12:00"));
}

export function formatEventTime(date: string, time: string, lang: Lang): string {
  if (!date || !time) return "";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: EVENT_TZ,
  })
    .format(eventStart(date, time))
    .toUpperCase();
}

/** Day number and short month, in IST, for templates that set the date in large type. */
export function eventDayParts(date: string, lang: Lang): { day: string; month: string } {
  if (!date) return { day: "", month: "" };
  const at = eventStart(date, "12:00");
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  return {
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: EVENT_TZ }).format(at),
    month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: EVENT_TZ }).format(at),
  };
}

/**
 * Where the "create your own" invitation can appear on an invite page.
 *
 * "footer" is the standing one at the bottom; "rsvp" is the one shown to a
 * guest who has just replied. They are counted apart because a guest who has
 * only scrolled and a guest who has just committed to attending are not the
 * same person, and one number for both hides which offer works.
 */
export const CTA_PLACEMENTS = ["footer", "rsvp"] as const;
export type CtaPlacement = (typeof CTA_PLACEMENTS)[number];

/** The placement named in a redirect's `?at=`, or "" when it is absent or junk. */
export function ctaPlacement(given: string | undefined | null): CtaPlacement | "" {
  return CTA_PLACEMENTS.includes(given as CtaPlacement) ? (given as CtaPlacement) : "";
}

/** The counting link a "create your own" invitation points at. */
export function ctaHref(slug: string, at: CtaPlacement): string {
  return `/r/invite?from=${encodeURIComponent(slug)}&at=${at}`;
}

/**
 * Where a guest's own reply is remembered in their browser.
 *
 * Shared because two components read it: the RSVP form, to show a guest the
 * answer they already gave, and the footer invitation, to get out of the way
 * once the one above it is showing. Two spellings of this string would put
 * the duplicated block back.
 */
export function rsvpStorageKey(slug: string): string {
  return `nyota:rsvp:${slug}`;
}

/**
 * Where the guest's Directions button goes.
 *
 * Coordinates when the host picked the venue from the suggestions, because
 * then we know the actual place and a search can still be ambiguous: there is
 * more than one Rose Garden Hall in India, and the guest gets a list instead
 * of a pin. Falls back to searching the text, which is what every invite made
 * before this did and what every invite at somebody's house still does.
 */
export function mapsUrl(venue: string, address: string, lat?: number | null, lng?: number | null): string {
  // A link the host pasted themselves wins: they stood in the place, opened
  // their map and shared that exact pin. Nothing we can derive beats it.
  const pasted = mapLinkIn(venue, address);
  if (pasted) return pasted;

  // No stripping needed below: we only reach here when there was no link
  // worth following, and text we did not recognise is better off in the
  // search than silently removed from it.
  const query =
    typeof lat === "number" && typeof lng === "number" ? `${lat},${lng}` : [venue, address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function gcalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(invite: InviteData, inviteUrl: string): string {
  let dates: string;
  if (invite.time) {
    const start = eventStart(invite.date, invite.time);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    dates = `${gcalStamp(start)}/${gcalStamp(end)}`;
  } else {
    const day = invite.date.replace(/-/g, "");
    const next = new Date(eventStart(invite.date, "12:00").getTime() + 24 * 60 * 60 * 1000);
    dates = `${day}/${next.toISOString().slice(0, 10).replace(/-/g, "")}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: invite.title,
    dates,
    // A URL in the location field shows up verbatim in the guest's calendar
    // entry, which is the same ugliness as on the card.
    location: [withoutMapLink(invite.venue), withoutMapLink(invite.address)].filter(Boolean).join(", "),
    details: `${invite.message}\n\n${inviteUrl}`.trim(),
    ctz: EVENT_TZ,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export function slugBase(title: string, fallback: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return base.length >= 3 ? base : fallback;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Share message without the link, for share sheets that attach the URL separately. */
export function shareMessage(invite: InviteData): string {
  const date = formatEventDate(invite.date, invite.lang);
  const time = formatEventTime(invite.date, invite.time, invite.lang);
  const when = [date, time].filter(Boolean).join(", ");
  const [invited, cta] =
    invite.lang === "hi"
      ? ["🎉 आपको न्योता है!", "न्योता देखें और जवाब दें 👇"]
      : ["🎉 You're invited!", "Open your invite & RSVP 👇"];
  return `${invited}\n*${invite.title}*\n📅 ${when}\n📍 ${withoutMapLink(invite.venue)}\n\n${cta}`;
}

export function whatsappShareText(invite: InviteData, url: string): string {
  return `${shareMessage(invite)}\n${url}`;
}
