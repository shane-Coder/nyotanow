"use client";

import { guestListCsv, guestListFilename, type GuestRow } from "@/lib/csv";

/**
 * The guest list as a CSV the host can open in Excel or Sheets.
 *
 * Hosts asked for it, and it is also the only copy of the list that survives
 * losing the private link — worth something until invites have an owner.
 *
 * Built in the browser from data already on the page, so there is no new
 * endpoint and nothing extra to protect. The escaping lives in lib/csv.ts
 * because a guest's name running as a spreadsheet formula is the one way this
 * feature could hurt the person who uses it, and that deserves tests.
 */
export function GuestListDownload({ rsvps, title }: { rsvps: GuestRow[]; title: string }) {
  if (rsvps.length === 0) return null;

  const download = () => {
    // The BOM is what makes Excel read Devanagari names as Hindi rather than
    // as mojibake.
    const blob = new Blob(["﻿" + guestListCsv(rsvps)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = guestListFilename(title);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50"
    >
      ⬇️ Download guest list
    </button>
  );
}
