"use client";

import { NAVADURGA, currentOrNextFestival, navratriDays, nightOn } from "@/lib/navratri";
import { getPalette, type Lang, type PaletteId } from "@/lib/themes";

/**
 * The nine nights of Navratri, as a way into the form.
 *
 * A host making a pandal card is almost never thinking "I would like a
 * yellow invitation". They are thinking "Skandamata, Thursday, bhog at
 * seven". This offers that: pick the night and the card takes its date and
 * its colour from the day itself.
 *
 * It is also the part of this page worth reading when you are not making
 * anything — nine goddesses, their order and what each one stands for, which
 * is the same every Navratri and the reason the page is worth keeping up
 * between festivals.
 */

const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const dayFmtHi = new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

type Props = {
  lang: Lang;
  /** The date currently in the form, so the chosen night can be marked. */
  date: string;
  /** Today in IST, or null before the browser has mounted. */
  today: string | null;
  onPick: (night: { date: string; palette: PaletteId }) => void;
};

export function NavratriNights({ lang, date, today, onPick }: Props) {
  // Null until mounted, like every other clock in this form, so the server
  // and the browser cannot render two different festivals.
  const festival = today ? currentOrNextFestival(today) : null;
  const tonight = today ? nightOn(today) : null;

  // No date for this year yet: the goddesses still stand on their own, and
  // the host picks a date and a colour the ordinary way.
  if (!festival) {
    return (
      <Frame lang={lang}>
        <ul className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {NAVADURGA.map((d) => (
            <li key={d.day} className="flex gap-2">
              <span className="w-4 shrink-0 text-right tabular-nums text-stone-400">{d.day}</span>
              <span>
                <span className="font-semibold text-stone-800">{lang === "hi" ? d.hi : d.en}</span>{" "}
                <span className="text-stone-500">{d.meaning[lang]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Frame>
    );
  }

  const nights = navratriDays(festival.start);
  const fmt = lang === "hi" ? dayFmtHi : dayFmt;

  return (
    <Frame lang={lang}>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
        {nights.map((n, i) => {
          const palette = getPalette(n.palette);
          const chosen = date === n.date;
          return (
            <button
              key={n.devi.day}
              type="button"
              onClick={() => onPick({ date: n.date, palette: n.palette })}
              aria-pressed={chosen}
              title={n.devi.meaning[lang]}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ring-offset-2 transition ${
                chosen ? "ring-3 ring-stone-900" : "ring-1 ring-stone-200 hover:ring-stone-400"
              }`}
            >
              <span
                aria-hidden
                className="size-7 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: `linear-gradient(135deg, ${palette.bg2} 0 50%, ${palette.accent} 50% 100%)` }}
              />
              <span className="min-w-0">
                <span className="block text-sm leading-tight font-semibold text-stone-800">
                  {lang === "hi" ? n.devi.hi : n.devi.en}
                </span>
                <span className="block whitespace-nowrap text-xs text-stone-500">
                  {lang === "hi" ? `दिन ${n.devi.day}` : `Day ${n.devi.day}`} · {fmt.format(new Date(`${n.date}T12:00:00+05:30`))}
                  {tonight === i + 1 && (
                    <span className="ml-1.5 font-semibold text-brand">{lang === "hi" ? "आज" : "today"}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Frame>
  );
}

function Frame({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-200/70">
      <p className="mb-1 text-sm font-semibold text-stone-800">
        {lang === "hi" ? "नवरात्रि के नौ दिन" : "The nine nights"}
      </p>
      <p className="mb-3 text-xs text-stone-500">
        {lang === "hi"
          ? "दिन चुनें — तारीख़ और रंग उसी दिन के अनुसार लग जाएँगे।"
          : "Pick a night and the card takes that day's date and colour."}
      </p>
      {children}
    </div>
  );
}
