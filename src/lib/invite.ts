import { z } from "zod";
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

export function mapsUrl(venue: string, address: string): string {
  const q = [venue, address].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
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
    location: [invite.venue, invite.address].filter(Boolean).join(", "),
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
  return `${invited}\n*${invite.title}*\n📅 ${when}\n📍 ${invite.venue}\n\n${cta}`;
}

export function whatsappShareText(invite: InviteData, url: string): string {
  return `${shareMessage(invite)}\n${url}`;
}
