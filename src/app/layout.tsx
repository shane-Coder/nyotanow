import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Playfair_Display, Poppins, Tiro_Devanagari_Hindi } from "next/font/google";
import { siteUrl } from "@/lib/invite";
import "./globals.css";

// Poppins ships Devanagari glyphs, so Hindi and English share one sans face.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Playfair has no Devanagari; the serif stack falls back to Tiro for Hindi.
const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["latin", "devanagari"],
  weight: "400",
  style: ["normal", "italic"],
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
    <html lang="en" className={`${poppins.variable} ${playfair.variable} ${tiro.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        {/* Cookieless page-view counts (Vercel Web Analytics). */}
        <Analytics />
      </body>
    </html>
  );
}
