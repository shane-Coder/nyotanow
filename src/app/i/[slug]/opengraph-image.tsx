import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { findInvite, toInviteData } from "@/db/queries";
import { formatEventDate, formatEventTime } from "@/lib/invite";
import { getOccasion } from "@/lib/occasions";
import { getPalette } from "@/lib/themes";

// This is the preview WhatsApp shows when the link is pasted into a chat,
// so it matters more than almost any other image on the site.
export const alt = "You're invited";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Reads live data (edits, RSVP counts) from the DB, so never serve a cached copy.
export const dynamic = "force-dynamic";

const fontDir = join(process.cwd(), "assets/fonts");
const playfairBold = readFile(join(fontDir, "playfair-display-latin-700-normal.woff"));
const playfairRegular = readFile(join(fontDir, "playfair-display-latin-400-normal.woff"));

// Satori can't shape Devanagari (matras and conjuncts come out broken), so
// Hindi text is swapped for English equivalents in the preview image only.
const isLatin = (s: string) => /^[\p{Script=Latin}\p{N}\p{P}\p{Zs}\p{S}]*$/u.test(s);

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const row = await findInvite((await params).slug);
  const [bold, regular] = await Promise.all([playfairBold, playfairRegular]);
  const fonts = [
    { name: "Playfair", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Playfair", data: regular, weight: 400 as const, style: "normal" as const },
  ];

  if (!row) {
    return new ImageResponse(<Fallback />, { ...size, fonts });
  }

  const invite = toInviteData(row);
  const p = getPalette(invite.palette);
  const occasion = getOccasion(invite.occasion);
  const title = isLatin(invite.title) ? invite.title : `${occasion?.name.en ?? "Event"} Invitation`;
  const venue = isLatin(invite.venue) ? invite.venue : "";
  const when = [formatEventDate(invite.date, "en"), formatEventTime(invite.date, invite.time, "en")]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${p.bg} 0%, ${p.bg2} 100%)`,
          color: p.ink,
          fontFamily: "Playfair",
          padding: 40,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `6px solid ${p.accent}`,
            borderRadius: 24,
            padding: "40px 60px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 88 }}>{occasion?.emoji ?? "🎉"}</div>
          <div style={{ fontSize: 30, color: p.accent, marginTop: 8, letterSpacing: 4 }}>YOU&apos;RE INVITED</div>
          <div style={{ fontSize: title.length > 32 ? 58 : 72, fontWeight: 700, marginTop: 12, lineHeight: 1.1 }}>{title}</div>
          <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>{when}</div>
          {venue && <div style={{ fontSize: 28, marginTop: 8, opacity: 0.8 }}>{`📍 ${venue}`}</div>}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

function Fallback() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fffaf3",
        color: "#2b1a3d",
        fontFamily: "Playfair",
        fontSize: 80,
        fontWeight: 700,
      }}
    >
      NyotaNow
    </div>
  );
}
