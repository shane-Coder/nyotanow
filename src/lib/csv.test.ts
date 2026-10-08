import { describe, expect, it } from "vitest";
import { guestListCsv, guestListFilename } from "./csv";

const guest = (over: Partial<Parameters<typeof guestListCsv>[0][number]> = {}) => ({
  name: "Asha",
  status: "yes",
  guests: 2,
  note: "",
  ...over,
});

describe("the guest list export", () => {
  it("writes a header and a row per guest", () => {
    const csv = guestListCsv([guest(), guest({ name: "Ravi", status: "maybe", guests: 1 })]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe('"Name","Reply","People","Note"');
    expect(lines[1]).toBe('"Asha","Coming","2",""');
    expect(lines[2]).toBe('"Ravi","Maybe","1",""');
  });

  it("writes one person for a guest who cannot come", () => {
    // Matches what the host sees on the page; a no is not eight people.
    expect(guestListCsv([guest({ status: "no", guests: 8 })])).toContain('"Not coming","0"');
  });

  it("escapes quotes and keeps commas and newlines inside the field", () => {
    const csv = guestListCsv([guest({ name: 'Ravi "Raj"', note: "Bringing sweets, and a cake\nsee you" })]);
    expect(csv).toContain('"Ravi ""Raj"""');
    expect(csv).toContain("Bringing sweets, and a cake");
  });

  it("stops a guest's name being run as a spreadsheet formula", () => {
    // The real risk in this feature: names are arbitrary text from the
    // internet, and Excel runs a field that opens with = + - or @.
    for (const danger of [
      '=HYPERLINK("http://evil.example","click")',
      "+1234",
      "-2+3",
      "@SUM(A1:A9)",
    ]) {
      const row = guestListCsv([guest({ name: danger })]).split("\r\n")[1];
      // Quotes inside the value are doubled by the escaping, so compare
      // against the escaped form rather than the raw one.
      expect(row.startsWith(`"'${danger.replace(/"/g, '""')}"`), danger).toBe(true);
    }
  });

  it("guards the note column too, not only the name", () => {
    expect(guestListCsv([guest({ note: "=cmd|' /c calc'!A1" })])).toContain(`"'=cmd`);
  });

  it("leaves ordinary text alone", () => {
    const csv = guestListCsv([guest({ name: "श्रीमती शर्मा", note: "देर से आएँगे" })]);
    expect(csv).toContain('"श्रीमती शर्मा"');
    expect(csv).not.toContain("'श्रीमती");
  });

  describe("filename", () => {
    it("comes from the invite title", () => {
      expect(guestListFilename("Aarav's 5th Birthday")).toBe("Aarav-s-5th-Birthday.csv");
    });

    it("keeps Devanagari rather than stripping it to nothing", () => {
      expect(guestListFilename("गृह प्रवेश")).toBe("गृह-प्रवेश.csv");
    });

    it("falls back when the title has nothing usable", () => {
      expect(guestListFilename("!!! ???")).toBe("guest-list.csv");
      expect(guestListFilename("")).toBe("guest-list.csv");
    });
  });
});
