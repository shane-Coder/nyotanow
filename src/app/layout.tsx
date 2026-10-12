import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Playfair_Display, Poppins, Tiro_Devanagari_Hindi } from "next/font/google";
import { StageBanner } from "@/components/StageBanner";
import { siteUrl } from "@/lib/invite";
import "./globals.css";

// Poppins ships Devanagari glyphs, so Hindi and English share one sans face.
//
// Three weights, not five. Every weight is two files here — a Latin one of
// about 8KB and a Devanagari one of about 38KB — and all of them are
// preloaded, so each weight costs roughly 46KB on the first view of every
// page whether or not anything on screen uses it. The guest invite page was
// 739KB with 473KB of that fonts, and it is the page every guest opens on a
// phone over mobile data.
//
// 500 and 600 are hard to tell apart at the 13-14px those UI labels are set
// in, and 800 was three card titles that read as bold at 700.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

// The same face again for Devanagari, as its own instance so it can be left
// out of the preload. One Poppins covering both subsets preloaded all six
// files, and the three Devanagari ones are 114KB that an English invite
// never draws. Split, the Latin half is still preloaded for first paint and
// the Devanagari half arrives when there is Devanagari to draw.
//
// Hindi sans text reaches it by per-glyph fallback through --font-sans. The
// PNG export is the thing to watch there, and a Hindi Confetti card — title
// in sans, the case most at risk — was exported before and after this split
// and came out identical.
const poppinsDevanagari = Poppins({
  variable: "--font-poppins-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  preload: false,
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Playfair has no Devanagari; the serif stack falls back to Tiro for Hindi.
//
// Not preloaded. Tiro is only ever painted on a Hindi card — Playfair covers
// the Latin serif, and the Hindi UI runs on Poppins — yet preloading fetched
// all four files on every page, 167KB that an English invite never shows.
// Without the preload tag the @font-face unicode-range does its job: the
// files arrive when a Devanagari glyph is actually drawn in this face, and
// not before. The cost is that a Hindi card paints in the fallback serif for
// the moment it takes to arrive, which is a trade worth making on a phone.
const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["latin", "devanagari"],
  weight: "400",
  style: ["normal", "italic"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "NyotaNow · Beautiful invitations in 60 seconds, share on WhatsApp",
    template: "%s · NyotaNow",
  },
  description:
    "Make a beautiful invitation for birthdays, griha pravesh, anniversaries, pooja and parties in English or Hindi. Share one link on WhatsApp and see who's coming. Free, no sign-up.",
  openGraph: { siteName: "NyotaNow", type: "website", locale: "en_IN" },
};

export const viewport: Viewport = {
  themeColor: "#fffaf3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${poppinsDevanagari.variable} ${playfair.variable} ${tiro.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <StageBanner />
        {children}
        {/* Cookieless page-view counts (Vercel Web Analytics). */}
        <Analytics />
        {/*
          Core Web Vitals from real visitors, which is the only way to know
          what the site is actually like on the phones people have. Tapping
          an occasion was measured at 248ms in the field — past the 200ms
          where an interaction stops feeling instant — and that was found by
          chance rather than because anything was watching. This watches.

          Free on Hobby and it sets no cookies. Preview and production are
          reported separately, so a deployment used for testing cannot drag
          the real numbers around.
        */}
        <SpeedInsights />
      </body>
    </html>
  );
}
