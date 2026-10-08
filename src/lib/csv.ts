export type GuestRow = { name: string; status: string; guests: number; note: string };

const LABEL: Record<string, string> = { yes: "Coming", maybe: "Maybe", no: "Not coming" };

/**
 * One cell of a CSV.
 *
 * The leading quote on a field that starts with = + - @ is not decoration.
 * Excel and Google Sheets treat such a field as a formula, so a guest who
 * types =HYPERLINK("http://…") as their name would have the host's spreadsheet
 * run it when they opened the file. Guest names are arbitrary text from the
 * internet, which makes this the one place the export could hurt someone.
 */
function cell(value: string | number): string {
  const s = String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** The guest list as CSV text, ready to be saved. */
export function guestListCsv(rows: GuestRow[]): string {
  const out = [
    ["Name", "Reply", "People", "Note"],
    ...rows.map((r) => [r.name, LABEL[r.status] ?? r.status, r.status === "no" ? 0 : r.guests, r.note]),
  ];
  return out.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** A filename from the invite's title, falling back when it has no usable characters. */
export function guestListFilename(title: string): string {
  // \p{M} matters: Devanagari vowel signs are marks, not letters, so without
  // it "गृह प्रवेश" came out as "ग-ह-प-रव-श" with the matras cut off.
  const base = title
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "guest-list"}.csv`;
}
