"use client";

import { Logo } from "@/components/SiteChrome";
import { parseJson, useStoredValue } from "@/lib/client-store";
import { GUEST_UI } from "@/lib/i18n";
import { ctaHref, rsvpStorageKey, type CtaPlacement } from "@/lib/invite";
import type { Lang } from "@/lib/themes";

/**
 * The "make your own" invitation shown to a guest — the whole growth loop.
 *
 * It used to be one strip of grey 12px text under the RSVP card. Over seven
 * days, 45 guests opened an invite and none of them tapped it, so the problem
 * was never persuasion; they simply never saw it. This gives it the same
 * visual weight as the RSVP card it sits under, and adds a second one at the
 * moment a guest has just replied, which is the only point on the page where
 * we know for certain they are engaged.
 *
 * Deliberately still quiet in tone. The page is someone's family invitation,
 * and an ad shouting over a griha pravesh card would cost more trust than the
 * extra taps are worth.
 *
 * Only ever one of the two is on screen. Shown together they were the same
 * heading, the same sentence and the same button twice in a row, which reads
 * as a bug rather than as an offer.
 */

export function CreateOwnCta({ slug, lang, at }: { slug: string; lang: Lang; at: CtaPlacement }) {
  const t = GUEST_UI[lang];

  // Hooks cannot be conditional, so this is read for both placements and only
  // acted on by the footer. The server snapshot is null, so the page ships
  // with the footer present — correct for every guest who has not replied,
  // and corrected on hydration for the few who have, in the same pass that
  // swaps the RSVP form for the answer they already gave.
  const replied = parseJson<unknown>(useStoredValue(rsvpStorageKey(slug)), null) !== null;
  if (at === "footer" && replied) return null;

  // A plain anchor, never <Link>: prefetching a counting route records taps
  // nobody made, which is how this number gets quietly poisoned.
  const button = (
    <a
      href={ctaHref(slug, at)}
      className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
    >
      {t.ctaButton}
    </a>
  );

  if (at === "rsvp") {
    return (
      <div className="mt-6 border-t border-stone-200 pt-5 text-center">
        <p className="text-base font-bold text-stone-800">{t.ctaHeading}</p>
        <p className="mt-1 mb-4 text-pretty text-sm text-stone-600">{t.ctaBody}</p>
        {button}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          {t.madeWith} <Logo className="text-base" />
        </p>
      </div>
    );
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-5 text-center shadow-lg ring-1 ring-black/5 sm:p-6">
      <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
        {t.madeWith} <Logo className="text-base" />
      </p>
      <p className="mt-3 text-lg font-bold text-stone-800">{t.ctaHeading}</p>
      <p className="mt-1 mb-4 text-pretty text-sm text-stone-600">{t.ctaBody}</p>
      {button}
    </section>
  );
}
