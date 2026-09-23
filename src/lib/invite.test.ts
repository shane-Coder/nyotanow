import { describe, expect, it } from "vitest";
import {
  eventDayParts,
  eventStart,
  formatEventDate,
  formatEventTime,
  googleCalendarUrl,
  inviteSchema,
  mapsUrl,
  rsvpSchema,
  shareMessage,
  slugBase,
  todayInIST,
  type InviteData,
} from "./invite";

const base: InviteData = {
  occasion: "birthday",
  template: "confetti",
  palette: "rose",
  lang: "en",
  kicker: "You're invited to",
  title: "Aarav's 5th Birthday",
  hostedBy: "Neha & Rohit",
  date: "2026-10-25",
  time: "17:00",
  venue: "Funcity Play Zone",
  address: "DLF Mall, Noida",
  message: "Cake and games!",
};

describe("todayInIST", () => {
  it("is already tomorrow in India while it is still yesterday in UTC", () => {
    // 18:45 UTC is 00:15 the next day in IST. A naive toISOString() here would
    // reject a perfectly valid event date for the next four and a half hours.
    expect(todayInIST(new Date("2026-09-23T18:45:00Z"))).toBe("2026-09-24");
  });

  it("is still today in India just before the IST midnight boundary", () => {
    expect(todayInIST(new Date("2026-09-23T18:15:00Z"))).toBe("2026-09-23");
  });
});

describe("eventStart", () => {
  it("reads the wall-clock time as IST, not as the server's timezone", () => {
    // 17:00 IST is 11:30 UTC.
    expect(eventStart("2026-10-25", "17:00").toISOString()).toBe("2026-10-25T11:30:00.000Z");
  });

  it("treats a missing time as midnight IST", () => {
    expect(eventStart("2026-10-25", "").toISOString()).toBe("2026-10-24T18:30:00.000Z");
  });
});

describe("formatting", () => {
  it("formats the date in Indian English", () => {
    expect(formatEventDate("2026-10-25", "en")).toBe("Sunday, 25 October 2026");
  });

  it("formats the date in Hindi", () => {
    expect(formatEventDate("2026-10-25", "hi")).toContain("2026");
  });

  it("returns an empty string rather than 'Invalid Date' when there is no date", () => {
    expect(formatEventDate("", "en")).toBe("");
    expect(formatEventTime("2026-10-25", "", "en")).toBe("");
  });

  it("formats the time in IST with an am/pm marker", () => {
    expect(formatEventTime("2026-10-25", "17:00", "en")).toMatch(/5:00\s?PM/);
  });
});

describe("slugBase", () => {
  it("strips apostrophes instead of turning them into dashes", () => {
    expect(slugBase("Aarav's 5th Birthday", "birthday")).toBe("aaravs-5th-birthday");
  });

  it("falls back to the occasion when the title has no Latin letters", () => {
    // Devanagari titles would otherwise collapse to an empty slug.
    expect(slugBase("हमारे नए घर का गृह प्रवेश", "griha-pravesh")).toBe("griha-pravesh");
  });

  it("keeps slugs short and never ends one with a dash", () => {
    const slug = slugBase("A very long birthday party title that runs on and on", "birthday");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("mapsUrl", () => {
  it("encodes the venue and address into one search query", () => {
    const url = new URL(mapsUrl("Funcity Play Zone", "DLF Mall, Noida"));
    expect(url.searchParams.get("query")).toBe("Funcity Play Zone, DLF Mall, Noida");
  });

  it("omits the separator when there is no address", () => {
    expect(new URL(mapsUrl("Funcity", "")).searchParams.get("query")).toBe("Funcity");
  });
});

describe("googleCalendarUrl", () => {
  it("books a three-hour slot in IST for an event with a time", () => {
    const url = new URL(googleCalendarUrl(base, "https://nyotanow.vercel.app/i/x"));
    expect(url.searchParams.get("ctz")).toBe("Asia/Kolkata");
    expect(url.searchParams.get("dates")).toBe("20261025T113000Z/20261025T143000Z");
  });

  it("books a whole day when the host didn't pick a time", () => {
    const url = new URL(googleCalendarUrl({ ...base, time: "" }, "https://x/i/y"));
    expect(url.searchParams.get("dates")).toBe("20261025/20261026");
  });

  it("carries the invite link in the details so guests can get back to it", () => {
    const url = new URL(googleCalendarUrl(base, "https://nyotanow.vercel.app/i/abc"));
    expect(url.searchParams.get("details")).toContain("https://nyotanow.vercel.app/i/abc");
  });
});

describe("shareMessage", () => {
  it("writes the WhatsApp message in Hindi for Hindi invites", () => {
    expect(shareMessage({ ...base, lang: "hi" })).toContain("आपको न्योता है");
  });

  it("writes it in English otherwise", () => {
    expect(shareMessage(base)).toContain("You're invited!");
  });
});

describe("validation", () => {
  it("accepts a complete invite", () => {
    expect(inviteSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a one-character title", () => {
    expect(inviteSchema.safeParse({ ...base, title: "x" }).success).toBe(false);
  });

  it("rejects a title longer than 80 characters", () => {
    expect(inviteSchema.safeParse({ ...base, title: "x".repeat(81) }).success).toBe(false);
  });

  it("requires a venue", () => {
    expect(inviteSchema.safeParse({ ...base, venue: "" }).success).toBe(false);
  });

  it("rejects an occasion that isn't one of ours", () => {
    expect(inviteSchema.safeParse({ ...base, occasion: "wedding-funeral" }).success).toBe(false);
  });

  it("caps the guest count so one reply can't claim 900 people", () => {
    expect(rsvpSchema.safeParse({ name: "A", status: "yes", guests: 21, note: "" }).success).toBe(false);
    expect(rsvpSchema.safeParse({ name: "A", status: "yes", guests: 20, note: "" }).success).toBe(true);
  });

  it("accepts the guest count as the string a form actually sends", () => {
    expect(rsvpSchema.safeParse({ name: "A", status: "yes", guests: "3", note: "" }).success).toBe(true);
  });
});

describe("eventDayParts", () => {
  it("gives the day number and short month for the Poster design", () => {
    expect(eventDayParts("2026-10-25", "en")).toEqual({ day: "25", month: "Oct" });
  });

  it("uses the Indian calendar day, not the UTC one", () => {
    // 2026-01-01 at midnight IST is still 2025-12-31 in UTC.
    expect(eventDayParts("2026-01-01", "en").day).toBe("1");
  });

  it("returns empty strings rather than NaN when no date is set yet", () => {
    expect(eventDayParts("", "en")).toEqual({ day: "", month: "" });
  });
});
