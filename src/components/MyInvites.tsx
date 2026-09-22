"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { parseJson, useStoredValue, writeStored } from "@/lib/client-store";
import { EVENT_TZ, eventStart, todayInIST } from "@/lib/invite";

// Hosts don't have accounts yet, so the browser remembers their private
// manage links. Losing them only means losing easy access, not the invite.
// `date` was added later; entries saved before that pick it up the next time
// the host opens their manage page.
type Saved = { slug: string; key: string; title: string; date?: string; savedAt: number };
const KEY = "nyota:my-invites";

function read(): Saved[] {
  try {
    return parseJson<Saved[]>(localStorage.getItem(KEY), []);
  } catch {
    return [];
  }
}

export function RememberInvite({
  slug,
  editKey,
  title,
  date,
}: {
  slug: string;
  editKey: string;
  title: string;
  date: string;
}) {
  useEffect(() => {
    const rest = read().filter((i) => i.slug !== slug);
    const entry: Saved = { slug, key: editKey, title, date, savedAt: Date.now() };
    writeStored(KEY, JSON.stringify([entry, ...rest].slice(0, 30)));
  }, [slug, editKey, title, date]);
  return null;
}

const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: EVENT_TZ,
});

export function MyInvites() {
  const raw = useStoredValue(KEY);
  const { upcoming, past } = useMemo(() => {
    const today = todayInIST();
    const items = parseJson<Saved[]>(raw, []);
    const isPast = (i: Saved) => !!i.date && i.date < today;
    return {
      // Soonest first, like a calendar. Undated (older) entries go last.
      upcoming: items
        .filter((i) => !isPast(i))
        .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999")),
      // Most recent first.
      past: items.filter(isPast).sort((a, b) => b.date!.localeCompare(a.date!)),
    };
  }, [raw]);

  if (!upcoming.length && !past.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold">Your invites</h2>
        <ul className="mt-3 divide-y divide-stone-100">
          {upcoming.map((i) => (
            <InviteRow key={i.slug} invite={i} ended={false} />
          ))}
          {past.map((i) => (
            <InviteRow key={i.slug} invite={i} ended />
          ))}
        </ul>
      </div>
    </section>
  );
}

function InviteRow({ invite, ended }: { invite: Saved; ended: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className={`min-w-0 ${ended ? "opacity-60" : ""}`}>
        <p className={`truncate font-medium ${ended ? "text-stone-500 line-through decoration-stone-400" : ""}`}>
          {invite.title}
        </p>
        {invite.date && (
          <p className="text-sm text-stone-500">
            {shortDate.format(eventStart(invite.date, "12:00"))}
            {ended && (
              <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-500">
                Ended
              </span>
            )}
          </p>
        )}
      </div>
      <Link
        href={`/i/${invite.slug}/manage?key=${invite.key}`}
        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold ${
          ended ? "border border-stone-300 text-stone-600" : "bg-stone-900 text-white"
        }`}
      >
        {ended ? "View RSVPs" : "RSVPs & share"}
      </Link>
    </li>
  );
}
