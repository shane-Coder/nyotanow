import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getPalette } from "@/lib/themes";

/**
 * The preview people see when nyotanow.in is pasted into a chat.
 *
 * Invite pages have had one of these since the start; the home page never
 * did, so sharing the site itself unfurled as a wall of text. That is a poor
 * showing for a product whose entire pitch is that the cards look good — it
 * asks people to take on faith the one thing a picture could just show them.
 *
 * So the image is a card, not a logo. Someone scrolling a busy group should
 * understand what this makes without reading a word.
 *
 * Static: the home page does not change per request, so this is generated
 * once at build time rather than rendered for every crawler that asks.
 */

export const alt = "NyotaNow — invitations as links, not images";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "assets/fonts");
const playfairBold = readFile(join(fontDir, "playfair-display-latin-700-normal.woff"));
const playfairRegular = readFile(join(fontDir, "playfair-display-latin-400-normal.woff"));

export default async function Image() {
  const [bold, regular] = await Promise.all([playfairBold, playfairRegular]);
  // The darkest palette, because the card has to carry the whole right half
  // and read clearly as a thumbnail in a chat list.
  const p = getPalette("maroon");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(135deg, #fffaf3 0%, #ffe9cf 100%)",
          fontFamily: "Playfair",
          color: "#2b1a3d",
          padding: 56,
        }}
      >
        {/* The pitch */}
        <div style={{ display: "flex", flexDirection: "column", width: 600, paddingRight: 40 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>Nyota</span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "white",
                background: "#e8590c",
                borderRadius: 8,
                padding: "4px 12px",
                marginLeft: 6,
              }}
            >
              Now
            </span>
          </div>

          <div style={{ fontSize: 62, fontWeight: 700, lineHeight: 1.1, marginTop: 28 }}>
            Invitations as links, not images
          </div>

          <div style={{ fontSize: 30, marginTop: 24, lineHeight: 1.4, color: "#5b4a52" }}>
            Make one in a minute. Guests RSVP, see a countdown and get directions — all from the link.
          </div>

          {/* Latin only: Satori cannot shape Devanagari and this font has no
              glyphs for it, so "हिंदी" would render as empty boxes. */}
          <div style={{ display: "flex", fontSize: 26, marginTop: 32, color: "#8a6a55" }}>
            Free · No app · English or Hindi
          </div>
        </div>

        {/* What it makes */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 432,
            height: 470,
            borderRadius: 28,
            background: `linear-gradient(160deg, ${p.bg} 0%, ${p.bg2} 100%)`,
            color: p.ink,
            border: `3px solid ${p.accent}`,
            padding: 36,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 54 }}>🪔</div>
          <div style={{ fontSize: 18, color: p.accent, marginTop: 14, letterSpacing: 1.5 }}>
            WITH THE BLESSINGS OF THE ALMIGHTY
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, marginTop: 18, lineHeight: 1.15 }}>Our New Home</div>
          {/* Drawn rather than typed. The card uses ✦ on the site, but Playfair
              has no glyph for it and Satori has no fallback for symbols the way
              it does for emoji, so it came out as three empty boxes. */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 9,
                  height: 9,
                  background: p.accent,
                  transform: "rotate(45deg)",
                  marginLeft: i === 0 ? 0 : 14,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 26, marginTop: 20 }}>Sunday, 25 October</div>
          <div style={{ fontSize: 22, marginTop: 8, opacity: 0.85 }}>11:00 AM</div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 20 }}>B-204, Green Valley</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Playfair", data: bold, weight: 700, style: "normal" },
        { name: "Playfair", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
