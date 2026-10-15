/**
 * User text on its way into the Open Graph image.
 *
 * The card itself needs none of this. That is HTML, React escapes what it
 * renders, and a title containing markup comes out as the characters the
 * host typed.
 *
 * The preview image is a different path. Satori turns the JSX into SVG, and
 * the title and venue are the only things on that page a stranger chooses —
 * creating an invite needs no account, and both fields are checked for
 * length and nothing else. GHSA-vcvr-r3jv-pc5j was precisely that shape:
 * attacker-controlled text reaching SVG content through next/og. The fix was
 * an upgrade, which is to say the whole defence sat upstream.
 *
 * So this is one of our own, behind it. Not because 16.4.1 is unsafe, but
 * because the next advisory in that library should be something we read
 * about rather than something we are already running.
 */

/**
 * The same text, with everything that could stop being text taken out.
 *
 * Angle brackets are the only characters that can open a tag, so they go.
 * A host who writes "Party <3" loses one character from their preview
 * thumbnail, which is a fair price: the card still shows it in full, and
 * the thumbnail is the surface a stranger can aim at.
 *
 * Ampersands, apostrophes and quotes stay. None of them can open a tag on
 * its own, and "Mom & Dad's 40th" is a real invitation that should look like
 * one. Control characters go: they have no glyph and nothing types them by
 * accident.
 */
export function svgSafeText(value: string): string {
  return value
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
