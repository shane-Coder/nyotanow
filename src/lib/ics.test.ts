import { describe, expect, it } from "vitest";
import { buildIcs, escapeText, foldLine } from "./ics";
import type { InviteData } from "./invite";

const base: InviteData = {
  occasion: "birthday",
  template: "confetti",
  palette: "rose",
  lang: "en",
  kicker: "",
  title: "Aarav's 5th Birthday",
  hostedBy: "The Sharmas",
  date: "2026-11-22",
  time: "19:30",
  venue: "Community Hall",
  address: "Sector 18, Noida",
  placeLat: null,
  placeLng: null,
  message: "Cake, games and plenty of noise.",
} as InviteData;

const opts = { url: "https://nyotanow.in/i/abc", uid: "abc@nyotanow.in", sequence: 0, now: new Date("2026-10-16T05:00:00Z") };

/** The unfolded body, which is what a calendar reads after joining continuations. */
function unfold(ics: string): string {
  return ics.replace(/\r\n /g, "");
}

describe("escaping", () => {
  it("escapes the four characters the spec reserves", () => {
    expect(escapeText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  // Backslash has to be replaced first or it escapes its own output.
  it("does not double-escape a backslash it just added", () => {
    expect(escapeText(";")).toBe("\\;");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeText("Aarav's 5th Birthday")).toBe("Aarav's 5th Birthday");
  });
});

describe("folding", () => {
  it("leaves a short line alone", () => {
    expect(foldLine("SUMMARY:Party")).toBe("SUMMARY:Party");
  });

  it("never emits a line over 75 octets", () => {
    const folded = foldLine(`SUMMARY:${"a".repeat(200)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  // The reason this is measured in octets: Devanagari is three bytes per
  // character, so 75 characters is 225 and a character-counted fold would
  // sail past the limit.
  it("counts Devanagari by its bytes, not its characters", () => {
    const folded = foldLine(`SUMMARY:${"न्योता".repeat(20)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a character across two lines", () => {
    for (const sample of ["न्योता".repeat(30), "🎉".repeat(40), "आरव का पाँचवाँ जन्मदिन ".repeat(8)]) {
      const folded = foldLine(`SUMMARY:${sample}`);
      // A broken sequence survives the round trip as U+FFFD.
      expect(unfold(folded)).not.toContain("�");
      expect(unfold(folded)).toBe(`SUMMARY:${sample}`);
    }
  });

  it("gives continuation lines one octet less, for their leading space", () => {
    const lines = foldLine("X".repeat(300)).split("\r\n");
    expect(lines[0]).toHaveLength(75);
    for (const line of lines.slice(1, -1)) expect(line).toHaveLength(75); // space + 74
  });
});

describe("the calendar entry", () => {
  it("is a well-formed VCALENDAR with CRLF endings", () => {
    const ics = buildIcs(base, opts);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("puts a timed event in UTC with a three hour run", () => {
    const body = unfold(buildIcs(base, opts));
    // 19:30 IST is 14:00 UTC.
    expect(body).toContain("DTSTART:20261122T140000Z");
    expect(body).toContain("DTEND:20261122T170000Z");
  });

  // No time means the host picked only a day, so it should not be pinned to
  // an hour they never chose.
  it("writes an all-day entry when there is no time", () => {
    const body = unfold(buildIcs({ ...base, time: "" }, opts));
    expect(body).toContain("DTSTART;VALUE=DATE:20261122");
    // Exclusive end, so the day after.
    expect(body).toContain("DTEND;VALUE=DATE:20261123");
    expect(body).not.toContain("DTSTART:2026");
  });

  it("carries the title, place and link", () => {
    const body = unfold(buildIcs(base, opts));
    expect(body).toContain("SUMMARY:Aarav's 5th Birthday");
    expect(body).toContain("LOCATION:Community Hall\\, Sector 18\\, Noida");
    expect(body).toContain("URL:https://nyotanow.in/i/abc");
    expect(body).toContain("https://nyotanow.in/i/abc");
  });

  // The whole reason for a stable UID: an edited invite has to land on the
  // guest's existing entry instead of beside it.
  it("keeps the UID and raises the sequence so an edit updates in place", () => {
    const first = unfold(buildIcs(base, opts));
    const edited = unfold(buildIcs({ ...base, venue: "Town Hall" }, { ...opts, sequence: 480 }));
    expect(first).toContain("UID:abc@nyotanow.in");
    expect(edited).toContain("UID:abc@nyotanow.in");
    expect(first).toContain("SEQUENCE:0");
    expect(edited).toContain("SEQUENCE:480");
    expect(edited).toContain("LOCATION:Town Hall");
  });

  it("asks the guest's own phone to remind them the day before", () => {
    const body = unfold(buildIcs(base, opts));
    expect(body).toContain("BEGIN:VALARM");
    expect(body).toContain("TRIGGER:-P1D");
  });

  it("survives a Hindi invite intact", () => {
    const hindi = { ...base, lang: "hi", title: "आरव का पाँचवाँ जन्मदिन", venue: "सामुदायिक भवन" } as InviteData;
    const body = unfold(buildIcs(hindi, opts));
    expect(body).toContain("SUMMARY:आरव का पाँचवाँ जन्मदिन");
    expect(body).toContain("सामुदायिक भवन");
    expect(body).not.toContain("�");
  });

  it("drops a map link out of the location rather than spelling it out", () => {
    const withLink = { ...base, venue: "Community Hall https://maps.app.goo.gl/xyz" } as InviteData;
    expect(unfold(buildIcs(withLink, opts))).not.toContain("maps.app.goo.gl");
  });

  it("leaves out a location and description it does not have", () => {
    const bare = { ...base, venue: "", address: "", message: "" } as InviteData;
    const body = unfold(buildIcs(bare, opts));
    expect(body).not.toContain("LOCATION:");
    // The URL still goes in the description even with no message.
    expect(body).toContain("DESCRIPTION:https://nyotanow.in/i/abc");
  });
});
