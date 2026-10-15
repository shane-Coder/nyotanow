import { eventStart, type InviteData } from "./invite";
import { withoutMapLink } from "./map-link";

/**
 * The invitation as a calendar entry.
 *
 * A link to calendar.google.com is a Google link: an iPhone guest using
 * Apple Calendar is sent to a website and asked to sign into an account to
 * put an event on their own phone. An .ics file is the format every calendar
 * already understands, so the one link opens the native app on iOS, Android,
 * macOS and Windows and asks nobody to sign into anything.
 *
 * It also fits the one promise this product makes that an image cannot. A
 * guest who adds the event and then sees the host move the venue should not
 * be left with a stale entry, and a stable UID with a rising SEQUENCE is the
 * standard way to say "this is the same event, later" — calendars that honour
 * it update in place rather than leaving a duplicate behind.
 */

/** How long an event runs when the host gave a start time. Matches the card. */
const EVENT_HOURS = 3;

export type IcsOptions = {
  /** The invite's public URL, so a guest can get back to the card. */
  url: string;
  /** Stable for the life of the invite. The handle a calendar updates by. */
  uid: string;
  /** Rises with every edit. A calendar takes the higher number as newer. */
  sequence: number;
  now?: Date;
};

/**
 * RFC 5545 text escaping.
 *
 * Backslash goes first. Done in any other order it would escape the
 * backslashes the later replacements had just added.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold a line to 75 octets, continuations indented by one space.
 *
 * Octets, not characters — and that distinction is the whole reason this is
 * written out rather than done with slice(). A Devanagari character is three
 * bytes and an emoji is four, so a line counted in characters can be well
 * over the limit, and a line cut at a character offset can land in the middle
 * of a byte sequence and hand the calendar a broken glyph. Measuring the
 * encoded length and only ever cutting between characters avoids both.
 *
 * The leading space on a continuation counts toward its 75, so those lines
 * get one octet less of content.
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let octets = 0;
  let limit = 75;

  for (const ch of line) {
    const size = encoder.encode(ch).length;
    if (octets + size > limit) {
      out.push(current);
      current = "";
      octets = 0;
      limit = 74;
    }
    current += ch;
    octets += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

/** YYYYMMDDTHHMMSSZ, the UTC form every calendar accepts without a VTIMEZONE. */
function utcStamp(at: Date): string {
  return at.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** YYYYMMDD, for an all-day entry. */
function dateStamp(date: string): string {
  return date.replace(/-/g, "");
}

/** The day after the given YYYY-MM-DD. An all-day DTEND is exclusive. */
function dayAfter(date: string): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + 1);
  return dateStamp(at.toISOString().slice(0, 10));
}

export function buildIcs(invite: InviteData, opts: IcsOptions): string {
  const { url, uid, sequence, now = new Date() } = opts;

  // No time means the host only picked a day, so it goes in as an all-day
  // entry rather than being pinned to an hour nobody chose. An all-day DTEND
  // is exclusive, hence the day after.
  const when = invite.time
    ? [
        `DTSTART:${utcStamp(eventStart(invite.date, invite.time))}`,
        `DTEND:${utcStamp(new Date(eventStart(invite.date, invite.time).getTime() + EVENT_HOURS * 3600_000))}`,
      ]
    : [`DTSTART;VALUE=DATE:${dateStamp(invite.date)}`, `DTEND;VALUE=DATE:${dayAfter(invite.date)}`];

  // The map link the host pasted belongs in the card's button, not spelled
  // out in the middle of a calendar entry.
  const location = [withoutMapLink(invite.venue), withoutMapLink(invite.address)].filter(Boolean).join(", ");
  const description = [invite.message, url].filter(Boolean).join("\n\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NyotaNow//Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(uid)}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${utcStamp(now)}`,
    ...when,
    `SUMMARY:${escapeText(invite.title)}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    `URL:${escapeText(url)}`,
    // A guest who adds an invitation in October to attend in November wants
    // reminding. The day before is early enough to travel for.
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(invite.title)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF throughout, and a trailing one: the spec asks for it and some
  // parsers drop the last line without it.
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
