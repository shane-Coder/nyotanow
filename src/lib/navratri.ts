import type { PaletteId } from "./themes";

/**
 * The nine forms of Durga, in order.
 *
 * This list is the permanent part of Navratri and the reason this file is
 * worth having. The dates move every year and the colours move with them,
 * but Shailaputri is always the first night and Siddhidatri always the
 * ninth, in both the spring and the autumn festival, for as long as anyone
 * has counted them.
 */
export const NAVADURGA = [
  {
    day: 1,
    en: "Shailaputri",
    hi: "शैलपुत्री",
    meaning: { en: "Daughter of the Himalayas — strength and grounding", hi: "हिमालय की पुत्री — शक्ति और स्थिरता" },
  },
  {
    day: 2,
    en: "Brahmacharini",
    hi: "ब्रह्मचारिणी",
    meaning: { en: "Penance, discipline and quiet grace", hi: "तप, संयम और शांत साधना" },
  },
  {
    day: 3,
    en: "Chandraghanta",
    hi: "चंद्रघंटा",
    meaning: { en: "The half-moon bell — courage and peace", hi: "माथे पर अर्धचंद्र — साहस और शांति" },
  },
  {
    day: 4,
    en: "Kushmanda",
    hi: "कूष्माण्डा",
    meaning: { en: "Creator of the cosmos — warmth and light", hi: "सृष्टि की रचयिता — ऊर्जा और प्रकाश" },
  },
  {
    day: 5,
    en: "Skandamata",
    hi: "स्कंदमाता",
    meaning: { en: "Mother of Kartikeya — protective love and wisdom", hi: "कार्तिकेय की माता — ममता और ज्ञान" },
  },
  {
    day: 6,
    en: "Katyayani",
    hi: "कात्यायनी",
    meaning: { en: "Born to sage Katyayana — power and righteousness", hi: "ऋषि कात्यायन की पुत्री — शक्ति और न्याय" },
  },
  {
    day: 7,
    en: "Kalaratri",
    hi: "कालरात्रि",
    meaning: { en: "Destroyer of darkness and fear", hi: "अंधकार और भय का नाश" },
  },
  {
    day: 8,
    en: "Mahagauri",
    hi: "महागौरी",
    meaning: { en: "Purity, inner peace and forgiveness", hi: "पवित्रता, शांति और क्षमा" },
  },
  {
    day: 9,
    en: "Siddhidatri",
    hi: "सिद्धिदात्री",
    meaning: { en: "Wisdom, attainment and fulfilment", hi: "सिद्धि, ज्ञान और पूर्णता" },
  },
] as const;

export type Devi = (typeof NAVADURGA)[number];

/**
 * The Sarva Mangala Mangalye shloka from the Devi Mahatmya, in its two
 * lines, which is the invocation most people reciting anything at Navratri
 * will recite.
 *
 * Kept in Devanagari wherever it is shown, whatever language the card is
 * in. It is Sanskrit, not Hindi or English, and a romanised shloka reads
 * worse to the people who know it than a script someone else reads slowly.
 */
export const DURGA_SHLOKA = [
  "सर्वमंगल मांगल्ये शिवे सर्वार्थ साधिके।",
  "शरण्ये त्र्यंबके गौरी नारायणि नमोऽस्तुते।।",
] as const;

/**
 * The colour each weekday carries, from the planet that rules it — Sunday's
 * Surya is orange, Monday's Chandra white, and so on. Indexed to match
 * Date#getUTCDay(), so Sunday is first.
 *
 * This, not the goddess, is what sets the colour of a Navratri day. It is
 * why the two festivals of 2026 ran completely different sequences: the
 * spring one opened on a Thursday and began in yellow, the autumn one opened
 * on a Sunday and began in orange, with the same nine goddesses in between.
 * Hard-coding a colour against a goddess would have been wrong within six
 * months.
 */
const WEEKDAY_PALETTE: readonly PaletteId[] = [
  "marigold", // Sunday — orange
  "pearl", // Monday — white
  "vermilion", // Tuesday — red
  "cobalt", // Wednesday — royal blue
  "turmeric", // Thursday — yellow
  "emerald", // Friday — green
  "slate", // Saturday — grey
];

/**
 * Days eight and nine, which land on weekdays already spent.
 *
 * The panchangs do not agree on these two and publish a fresh pair each year
 * — autumn 2026 ran purple then peacock green, spring 2026 ran pink then
 * purple. Rather than guess annually, we keep one pair: purple for
 * Mahagauri's serenity, peacock green for Siddhidatri. Both are traditional,
 * both are what the current festival uses, and a host who wants something
 * else still has every other colour a tap away.
 */
const REPEAT_PALETTES: readonly [PaletteId, PaletteId] = ["royal", "peacock"];

export type Season = "chaitra" | "sharad";
export type Festival = { season: Season; start: string };

/**
 * Ghatasthapana, the first day, from the panchang.
 *
 * Not computable here. It falls on Shukla Pratipada — a lunar tithi worked
 * out from the positions of the sun and moon at a given place, not a date
 * that arithmetic can reach. So it is a table, and a short one on purpose:
 * every entry below has at least two sources agreeing on it.
 *
 * Deliberately missing: Chaitra 2028 (sources split between 26 and 27 March)
 * and Sharad 2030 (27 or 28 September). A year we cannot pin down is left
 * out rather than guessed at — see navratriDays' caller, which shows the nine
 * goddesses without dates when the year is unknown. Being silent about a date
 * is recoverable; being confidently wrong about one, on a page about
 * somebody's faith, is not.
 */
export const FESTIVALS: readonly Festival[] = [
  { season: "sharad", start: "2026-10-11" },
  { season: "chaitra", start: "2027-04-07" },
  { season: "sharad", start: "2027-09-30" },
  { season: "sharad", start: "2028-09-19" },
  { season: "chaitra", start: "2029-04-14" },
  { season: "sharad", start: "2029-10-08" },
  { season: "chaitra", start: "2030-04-03" },
];

export const NAVRATRI_NIGHTS = 9;

export type NavratriDay = {
  devi: Devi;
  /** YYYY-MM-DD. */
  date: string;
  palette: PaletteId;
};

/** Days added to a YYYY-MM-DD date, in UTC so no timezone can shift the day. */
function addDays(date: string, days: number): string {
  const at = new Date(`${date}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}

/**
 * The nine nights of one festival: which goddess, which date, which colour.
 *
 * The first seven take their colour from their own weekday, which is seven
 * distinct days and so seven distinct colours. The last two repeat weekdays
 * already used, and take the fixed pair above.
 */
export function navratriDays(start: string): NavratriDay[] {
  return NAVADURGA.map((devi, i) => {
    const date = addDays(start, i);
    const palette =
      i < WEEKDAY_PALETTE.length
        ? WEEKDAY_PALETTE[new Date(`${date}T00:00:00Z`).getUTCDay()]
        : REPEAT_PALETTES[i - WEEKDAY_PALETTE.length];
    return { devi, date, palette };
  });
}

/** The festival running on this date, if one is. */
export function festivalOn(today: string): Festival | null {
  return FESTIVALS.find((f) => today >= f.start && today <= addDays(f.start, NAVRATRI_NIGHTS - 1)) ?? null;
}

/**
 * The festival to show: the one running now, or the next one we know about.
 *
 * Null once the table runs out, which is the signal to show the nine
 * goddesses on their own rather than inventing dates for them.
 */
export function currentOrNextFestival(today: string): Festival | null {
  return festivalOn(today) ?? FESTIVALS.find((f) => f.start > today) ?? null;
}

/** Which night of the festival today is, 1-9, or null outside it. */
export function nightOn(today: string): number | null {
  const festival = festivalOn(today);
  if (!festival) return null;
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${festival.start}T00:00:00Z`)) / 86_400_000,
  );
  return days + 1;
}
