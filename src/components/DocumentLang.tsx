"use client";

import { useEffect } from "react";
import type { Lang } from "@/lib/themes";

/**
 * Tells assistive technology which language this invite is written in.
 *
 * The root layout is shared by every page, so <html lang> is always "en" even
 * when the card is entirely Devanagari — and a screen reader then reads Hindi
 * with English pronunciation rules, which is close to unintelligible.
 *
 * A layout cannot change the html element of a layout above it in Next, so
 * this sets it after mount and puts it back on the way out, leaving every
 * other page as it was.
 */
export function DocumentLang({ lang }: { lang: Lang }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.lang;
    root.lang = lang;
    return () => {
      root.lang = previous;
    };
  }, [lang]);
  return null;
}
