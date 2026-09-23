import type { CSSProperties, ReactNode } from "react";
import type { InviteData } from "@/lib/invite";
import { eventDayParts, formatEventDate, formatEventTime } from "@/lib/invite";
import { getOccasion } from "@/lib/occasions";
import { getPalette } from "@/lib/themes";

type Props = {
  invite: InviteData;
  /** Placeholder text shown (faded) for empty fields in the live preview. */
  placeholders?: Partial<Record<"title" | "hostedBy" | "venue", string>>;
  id?: string;
  className?: string;
};

type Resolved = {
  kicker: string;
  title: ReactNode;
  host: ReactNode;
  date: string;
  time: string;
  venue: ReactNode;
  address: string;
  message: string;
  emoji: string;
  /** Day number and short month, for designs that set the date in large type. */
  day: string;
  month: string;
  hi: boolean;
  /** Dark palettes need dark text on their (light, gold) accent colour. */
  dark: boolean;
  /** Display-font class for this card's language. */
  serif: string;
};

function Faded({ children }: { children: ReactNode }) {
  return <span className="opacity-45">{children}</span>;
}

function resolve(invite: InviteData, dark: boolean, placeholders: Props["placeholders"] = {}): Resolved {
  const hi = invite.lang === "hi";
  const pick = (value: string, fallback?: string) =>
    value ? value : fallback ? <Faded>{fallback}</Faded> : "";
  return {
    kicker: invite.kicker,
    title: pick(invite.title, placeholders.title),
    host: pick(invite.hostedBy, placeholders.hostedBy),
    date: formatEventDate(invite.date, invite.lang) || (hi ? "तारीख चुनें" : "Pick a date"),
    time: formatEventTime(invite.date, invite.time, invite.lang),
    venue: pick(invite.venue, placeholders.venue),
    address: invite.address,
    message: invite.message,
    emoji: getOccasion(invite.occasion)?.emoji ?? "🎉",
    ...eventDayParts(invite.date, invite.lang),
    hi,
    dark,
    serif: hi ? "font-hindi" : "font-serif",
  };
}

export function InviteCard({ invite, placeholders, id, className = "" }: Props) {
  const p = getPalette(invite.palette);
  const r = resolve(invite, p.dark, placeholders);
  const style = {
    "--bg": p.bg,
    "--bg2": p.bg2,
    "--ink": p.ink,
    "--accent": p.accent,
    "--soft": p.soft,
  } as CSSProperties;

  return (
    <div className={`@container w-full ${className}`}>
      <div
        id={id}
        style={style}
        className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg)] text-[var(--ink)]"
      >
        {invite.template === "classic" && <Classic r={r} />}
        {invite.template === "confetti" && <Confetti r={r} />}
        {invite.template === "shubh" && <Shubh r={r} />}
        {invite.template === "botanical" && <Botanical r={r} />}
        {invite.template === "minimal" && <Minimal r={r} />}
        {invite.template === "poster" && <Poster r={r} />}
        {invite.template === "mehrab" && <Mehrab r={r} />}
      </div>
    </div>
  );
}

/* ----------------------------- Elegant ----------------------------- */

function Classic({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--bg2)_0%,transparent_60%)] opacity-70" />
      <div className="absolute inset-[4cqw] border-[0.5cqw] border-[var(--accent)]" />
      <div className="absolute inset-[5.6cqw] border-[0.18cqw] border-[var(--accent)] opacity-60" />
      {[
        "top-[3cqw] left-[3cqw]",
        "top-[3cqw] right-[3cqw] rotate-90",
        "bottom-[3cqw] right-[3cqw] rotate-180",
        "bottom-[3cqw] left-[3cqw] -rotate-90",
      ].map((pos) => (
        <CornerFlourish key={pos} className={`absolute size-[11cqw] text-[var(--accent)] ${pos}`} />
      ))}

      <div className="relative flex h-full flex-col justify-center px-[13cqw] text-center">
        <p
          className={`text-[var(--accent)] ${r.hi ? "text-[3.6cqw] font-semibold" : "text-[2.8cqw] font-semibold uppercase tracking-[0.3em]"}`}
        >
          {r.kicker}
        </p>
        <h2 className={`mt-[3cqw] ${r.serif} text-[8.6cqw] leading-[1.12] font-bold text-balance`}>{r.title}</h2>
        <Divider />
        <p className="text-[4cqw] font-semibold">{r.date}</p>
        {r.time && <p className="mt-[0.6cqw] text-[3.6cqw] opacity-85">{r.time}</p>}
        <p className="mt-[3.5cqw] text-[3.8cqw] font-semibold">{r.venue}</p>
        {r.address && <p className="mt-[0.5cqw] text-[3cqw] leading-snug opacity-75">{r.address}</p>}
        {r.message && (
          <p className={`mt-[4cqw] ${r.serif} text-[3.5cqw] leading-relaxed italic opacity-90 text-balance`}>
            {r.message}
          </p>
        )}
        {r.host && (
          <p className="mt-[4cqw] text-[3.2cqw] text-[var(--accent)]">
            {r.hi ? "स्नेहाकांक्षी" : "With love,"} <span className="font-semibold">{r.host}</span>
          </p>
        )}
      </div>
    </>
  );
}

function Divider() {
  return (
    <div className="my-[3.5cqw] flex w-[46cqw] items-center gap-[2cqw] self-center text-[var(--accent)]">
      <span className="h-[0.2cqw] flex-1 bg-current opacity-70" />
      <svg viewBox="0 0 24 24" className="size-[4cqw]" fill="currentColor" aria-hidden>
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
      <span className="h-[0.2cqw] flex-1 bg-current opacity-70" />
    </div>
  );
}

function CornerFlourish({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M2 38V14C2 7 7 2 14 2h24" />
      <path d="M8 38V18c0-6 4-10 10-10h20" opacity=".6" />
      <circle cx="14" cy="14" r="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ------------------------------- Fun ------------------------------- */

// Fixed positions so the server render, preview and download all match.
const CONFETTI: { x: number; y: number; s: number; r: number; shape: "dot" | "bar" | "tri"; c: "accent" | "ink" | "white" | "soft" }[] = [
  { x: 6, y: 5, s: 3, r: 20, shape: "bar", c: "accent" },
  { x: 18, y: 12, s: 2, r: 0, shape: "dot", c: "ink" },
  { x: 82, y: 6, s: 3.2, r: -30, shape: "tri", c: "accent" },
  { x: 92, y: 18, s: 2.2, r: 0, shape: "dot", c: "white" },
  { x: 70, y: 14, s: 2.6, r: 60, shape: "bar", c: "soft" },
  { x: 30, y: 4, s: 2.4, r: 0, shape: "dot", c: "soft" },
  { x: 4, y: 30, s: 2.2, r: 0, shape: "dot", c: "accent" },
  { x: 94, y: 40, s: 3, r: 40, shape: "bar", c: "ink" },
  { x: 3, y: 58, s: 3, r: -20, shape: "tri", c: "soft" },
  { x: 95, y: 64, s: 2.2, r: 0, shape: "dot", c: "accent" },
  { x: 7, y: 84, s: 2.8, r: 70, shape: "bar", c: "accent" },
  { x: 20, y: 93, s: 2, r: 0, shape: "dot", c: "ink" },
  { x: 88, y: 88, s: 3.2, r: 15, shape: "tri", c: "accent" },
  { x: 74, y: 95, s: 2.2, r: 0, shape: "dot", c: "soft" },
  { x: 50, y: 97, s: 2.6, r: -50, shape: "bar", c: "white" },
  { x: 60, y: 3, s: 2, r: 0, shape: "dot", c: "accent" },
];

function Confetti({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--bg)_20%,var(--bg2)_100%)]" />
      {CONFETTI.map((c, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            width: `${c.s}cqw`,
            height: c.shape === "bar" ? `${c.s * 0.4}cqw` : `${c.s}cqw`,
            transform: `rotate(${c.r}deg)`,
            borderRadius: c.shape === "dot" ? "9999px" : c.shape === "bar" ? "0.4cqw" : 0,
            clipPath: c.shape === "tri" ? "polygon(50% 0, 100% 100%, 0 100%)" : undefined,
            background: c.c === "white" ? "#ffffffcc" : `var(--${c.c})`,
            opacity: c.c === "ink" ? 0.35 : 0.9,
          }}
        />
      ))}

      <div className="relative flex h-full flex-col justify-center px-[10cqw] text-center">
        <div className={`flex size-[20cqw] items-center justify-center self-center rounded-full ${r.dark ? "bg-white/90" : "bg-white/70"} text-[11cqw] shadow-[0_1cqw_3cqw_rgba(0,0,0,0.12)]`}>
          {r.emoji}
        </div>
        <p className={`mt-[4cqw] max-w-full self-center truncate rounded-full bg-[var(--accent)] px-[3.5cqw] py-[1cqw] text-[3.1cqw] font-semibold ${r.dark ? "text-[var(--bg)]" : "text-white"}`}>
          {r.kicker}
        </p>
        <h2 className="mt-[3cqw] text-[8.8cqw] leading-[1.08] font-extrabold tracking-tight text-balance">{r.title}</h2>

        <div className="mt-[4.5cqw] flex flex-wrap justify-center gap-[2cqw] text-[3.4cqw] font-semibold">
          <span className="rounded-[2cqw] bg-white/75 px-[3cqw] py-[1.4cqw] text-[#1f1f1f]">📅 {r.date}</span>
          {r.time && <span className="rounded-[2cqw] bg-white/75 px-[3cqw] py-[1.4cqw] text-[#1f1f1f]">⏰ {r.time}</span>}
        </div>
        <p className="mt-[3cqw] text-[3.7cqw] font-semibold">📍 {r.venue}</p>
        {r.address && <p className="mt-[0.5cqw] text-[3cqw] leading-snug opacity-75">{r.address}</p>}
        {r.message && <p className="mt-[3.5cqw] text-[3.4cqw] leading-relaxed opacity-90 text-balance">{r.message}</p>}
        {r.host && <p className="mt-[3.5cqw] text-[3.2cqw] font-semibold text-[var(--accent)]">— {r.host}</p>}
      </div>
    </>
  );
}

/* ------------------------------ Shubh ------------------------------ */

function Shubh({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--bg2)_0%,var(--bg)_70%)]" />
      <Mandala className="absolute -bottom-[22cqw] -left-[22cqw] size-[60cqw] text-[var(--accent)] opacity-[0.09]" />
      <Mandala className="absolute -top-[10cqw] -right-[24cqw] size-[60cqw] text-[var(--accent)] opacity-[0.09]" />
      <div className="absolute inset-[3.5cqw] rounded-[1cqw] border-[0.6cqw] border-[var(--accent)]" />
      <div className="absolute inset-[5.5cqw] rounded-[0.6cqw] border-[0.35cqw] border-dotted border-[var(--accent)] opacity-70" />
      <Toran />

      <div className="relative flex h-full flex-col justify-center px-[12cqw] pt-[6cqw] text-center">
        <Mandala className="size-[15cqw] shrink-0 self-center text-[var(--accent)]" />
        <p className={`mt-[2.5cqw] text-[var(--accent)] ${r.hi ? "text-[3.8cqw]" : "text-[3.2cqw] italic font-serif"}`}>
          {r.kicker}
        </p>
        <h2 className={`mt-[2.5cqw] ${r.serif} text-[8.4cqw] leading-[1.15] font-bold text-[var(--accent)] text-balance`}>
          {r.title}
        </h2>
        <p className="mt-[3cqw] text-[3.1cqw] tracking-[0.5em] text-[var(--accent)] opacity-80">✦ ✦ ✦</p>
        <p className="mt-[2.5cqw] text-[4cqw] font-semibold">{r.date}</p>
        {r.time && <p className="mt-[0.6cqw] text-[3.5cqw] opacity-85">{r.time}</p>}
        <p className="mt-[3cqw] text-[3.8cqw] font-semibold">{r.venue}</p>
        {r.address && <p className="mt-[0.5cqw] text-[3cqw] leading-snug opacity-75">{r.address}</p>}
        {r.message && <p className="mt-[3.5cqw] text-[3.3cqw] leading-relaxed opacity-90 text-balance">{r.message}</p>}
        {r.host && (
          <p className="mt-[3.5cqw] text-[3.3cqw] text-[var(--accent)]">
            {r.hi ? "निवेदक" : "Warm regards,"} <span className="font-semibold">{r.host}</span>
          </p>
        )}
      </div>
    </>
  );
}

/** Marigold garland (toran) hanging across the top edge. */
function Toran() {
  const flowers = Array.from({ length: 13 }, (_, i) => i);
  return (
    <svg viewBox="0 0 130 22" className="absolute top-[3.5cqw] left-[3.5cqw] w-[calc(100%-7cqw)]" aria-hidden>
      <path d="M0 2 Q 32.5 14 65 2 Q 97.5 14 130 2" fill="none" stroke="#3f7d20" strokeWidth="1" />
      {flowers.map((i) => {
        const x = 5 + i * 10;
        const t = (x % 65) / 65;
        const y = 2 + 12 * 4 * t * (1 - t) * 0.5 + 1;
        return (
          <g key={i}>
            <line x1={x} y1={y} x2={x} y2={y + 6} stroke="#3f7d20" strokeWidth=".6" />
            <circle cx={x} cy={y + 8} r="3" fill={i % 2 ? "#f59e0b" : "#f97316"} />
            <circle cx={x} cy={y + 8} r="1.2" fill="#fde68a" />
          </g>
        );
      })}
    </svg>
  );
}

function Mandala({ className }: { className: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <svg viewBox="-50 -50 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <circle r="46" />
      <circle r="40" strokeDasharray="2 3" />
      {petals.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -12 C 7 -20, 7 -30, 0 -38 C -7 -30, -7 -20, 0 -12 Z" />
          <circle cy="-42" r="1.6" fill="currentColor" />
        </g>
      ))}
      <circle r="10" />
      <circle r="4" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------- Botanical ---------------------------- */

function Botanical({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--bg2)_0%,transparent_65%)] opacity-80" />
      <Sprig className="absolute bottom-[5cqw] left-[6cqw] w-[18cqw] text-[var(--accent)] opacity-60" />
      <Sprig className="absolute right-[6cqw] bottom-[5cqw] w-[18cqw] -scale-x-100 text-[var(--accent)] opacity-60" />

      <div className="relative flex h-full flex-col justify-center px-[13cqw] text-center">
        {/* In the flow rather than absolutely placed, so it can never sit on top
            of a long title the way an overlay would. */}
        <Wreath className="size-[17cqw] shrink-0 self-center text-[var(--accent)]" />
        <p className={`mt-[2cqw] text-[var(--accent)] ${r.hi ? "text-[3.5cqw]" : "font-serif text-[3cqw] italic"}`}>
          {r.kicker}
        </p>
        <h2 className={`mt-[2cqw] ${r.serif} text-[8.2cqw] leading-[1.14] font-bold text-balance`}>{r.title}</h2>
        <div className="my-[3cqw] flex w-[38cqw] items-center gap-[1.6cqw] self-center text-[var(--accent)]">
          <span className="h-[0.18cqw] flex-1 bg-current opacity-60" />
          <Leaf className="size-[3.6cqw]" />
          <span className="h-[0.18cqw] flex-1 bg-current opacity-60" />
        </div>
        <p className="text-[4cqw] font-semibold">{r.date}</p>
        {r.time && <p className="mt-[0.6cqw] text-[3.5cqw] opacity-85">{r.time}</p>}
        <p className="mt-[3cqw] text-[3.7cqw] font-semibold">{r.venue}</p>
        {r.address && <p className="mt-[0.5cqw] text-[3cqw] leading-snug opacity-75">{r.address}</p>}
        {r.message && (
          <p className={`mt-[3.5cqw] ${r.serif} text-[3.3cqw] leading-relaxed italic opacity-90 text-balance`}>
            {r.message}
          </p>
        )}
        {r.host && (
          <p className="mt-[3.5cqw] text-[3.2cqw] text-[var(--accent)]">
            {r.hi ? "स्नेहाकांक्षी" : "With love,"} <span className="font-semibold">{r.host}</span>
          </p>
        )}
      </div>
    </>
  );
}

function Leaf({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2c5 4 8 8 8 12a8 8 0 01-16 0c0-4 3-8 8-12z" opacity=".85" />
      <path d="M12 4v16" stroke="var(--bg)" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

/** A ring of leaves, used as a small medallion above the title. */
function Wreath({ className }: { className: string }) {
  const leaves = Array.from({ length: 18 }, (_, i) => i * 20);
  return (
    <svg viewBox="-50 -50 100 100" className={className} aria-hidden>
      {leaves.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <ellipse cx="0" cy="-38" rx="3.4" ry="8" fill="currentColor" opacity=".7" transform="rotate(20 0 -38)" />
        </g>
      ))}
      <circle r="27" fill="none" stroke="currentColor" strokeWidth="1" opacity=".5" />
    </svg>
  );
}

function Sprig({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <path d="M2 38 C 18 34, 34 24, 56 6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse
          key={i}
          cx={10 + i * 11}
          cy={33 - i * 6.2}
          rx="5.5"
          ry="2.6"
          fill="currentColor"
          opacity=".7"
          transform={`rotate(${-32 - i * 4} ${10 + i * 11} ${33 - i * 6.2})`}
        />
      ))}
    </svg>
  );
}

/* ----------------------------- Minimal ----------------------------- */

// The only left-aligned design, which is what makes it read as different at
// thumbnail size. Lines still span the full column, so the PNG export wraps
// exactly where the screen does.
function Minimal({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[var(--bg)]" />
      <span className="absolute top-0 left-0 h-full w-[2.2cqw] bg-[var(--accent)]" />

      <div className="relative flex h-full flex-col justify-center pr-[11cqw] pl-[14cqw] text-left">
        <p
          className={`text-[var(--accent)] ${r.hi ? "text-[3.4cqw] font-semibold" : "text-[2.6cqw] font-semibold uppercase tracking-[0.34em]"}`}
        >
          {r.kicker}
        </p>
        <h2 className={`mt-[3cqw] ${r.serif} text-[9.4cqw] leading-[1.05] font-bold text-balance ${r.hi ? "" : "tracking-tight"}`}>
          {r.title}
        </h2>
        <span className="mt-[4cqw] h-[0.3cqw] w-[16cqw] bg-[var(--accent)]" />
        <p className="mt-[4cqw] text-[3.9cqw] font-semibold">{r.date}</p>
        {r.time && <p className="mt-[0.4cqw] text-[3.4cqw] opacity-80">{r.time}</p>}
        <p className="mt-[3cqw] text-[3.6cqw] font-semibold">{r.venue}</p>
        {r.address && <p className="mt-[0.4cqw] text-[2.9cqw] leading-snug opacity-70">{r.address}</p>}
        {r.message && <p className="mt-[3.5cqw] text-[3.2cqw] leading-relaxed opacity-85">{r.message}</p>}
        {r.host && (
          <p className="mt-[3.5cqw] text-[3.1cqw] text-[var(--accent)]">
            {r.hi ? "निवेदक" : "Hosted by"} <span className="font-semibold">{r.host}</span>
          </p>
        )}
      </div>
    </>
  );
}

/* ------------------------------ Poster ----------------------------- */

function Poster({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[var(--bg)]" />
      {/* Diagonal accent block across the top third. */}
      <div
        className="absolute inset-x-0 top-0 h-[46cqw] bg-[var(--accent)]"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 74%, 0 100%)" }}
      />
      <div
        className="absolute inset-x-0 top-0 h-[46cqw] bg-[var(--bg2)] opacity-40"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 52%, 0 80%)" }}
      />

      <div className="relative flex h-full flex-col justify-between px-[9cqw] pt-[7cqw] pb-[8cqw]">
        <div className={`text-left ${r.dark ? "text-[var(--bg)]" : "text-white"}`}>
          <p className="text-[3cqw] font-bold uppercase tracking-[0.3em] opacity-90">{r.kicker}</p>
          {/* Before a date is picked the numeral would leave the block empty,
              so the occasion's emoji stands in. */}
          {r.day ? (
            <div className="mt-[1cqw] flex items-end gap-[3cqw]">
              <span className="text-[19cqw] leading-[0.82] font-extrabold tabular-nums">{r.day}</span>
              <span className="pb-[2.5cqw] text-[5cqw] leading-none font-bold uppercase">{r.month}</span>
            </div>
          ) : (
            <p className="mt-[1cqw] text-[16cqw] leading-[0.9]">{r.emoji}</p>
          )}
        </div>

        <div className="text-left">
          <h2
            className={`text-[9.6cqw] leading-[1.02] font-extrabold text-balance ${r.hi ? "" : "tracking-tight"}`}
          >
            {r.title}
          </h2>
          <p className="mt-[3cqw] text-[3.7cqw] font-bold text-[var(--accent)]">
            {r.date}
            {r.time ? ` · ${r.time}` : ""}
          </p>
          <p className="mt-[2.5cqw] text-[3.6cqw] font-semibold">{r.venue}</p>
          {r.address && <p className="mt-[0.4cqw] text-[2.9cqw] leading-snug opacity-70">{r.address}</p>}
          {r.message && <p className="mt-[3cqw] text-[3.2cqw] leading-relaxed opacity-85">{r.message}</p>}
          {r.host && <p className="mt-[3cqw] text-[3.1cqw] font-bold text-[var(--accent)]">— {r.host}</p>}
        </div>
      </div>
    </>
  );
}

/* ------------------------------ Mehrab ----------------------------- */

function Mehrab({ r }: { r: Resolved }) {
  return (
    <>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--bg2)_0%,var(--bg)_55%)]" />
      <Arch className="absolute inset-[4cqw] h-[calc(100%-8cqw)] w-[calc(100%-8cqw)] text-[var(--accent)]" />
      {["top-[6cqw] left-[6cqw]", "top-[6cqw] right-[6cqw] -scale-x-100"].map((pos) => (
        <Paisley key={pos} className={`absolute size-[9cqw] text-[var(--accent)] opacity-60 ${pos}`} />
      ))}

      <div className="relative flex h-full flex-col justify-center px-[15cqw] text-center">
        <p className="text-[4.5cqw] leading-none">{r.emoji}</p>
        <p
          className={`mt-[2cqw] text-[var(--accent)] ${r.hi ? "text-[3.6cqw]" : "text-[2.9cqw] font-semibold uppercase tracking-[0.24em]"}`}
        >
          {r.kicker}
        </p>
        <h2 className={`mt-[2.5cqw] ${r.serif} text-[8cqw] leading-[1.16] font-bold text-balance`}>{r.title}</h2>
        <div className="my-[3cqw] flex w-[34cqw] items-center gap-[1.6cqw] self-center text-[var(--accent)]">
          <span className="h-[0.18cqw] flex-1 bg-current opacity-55" />
          <span className="size-[1.6cqw] rotate-45 bg-current" />
          <span className="h-[0.18cqw] flex-1 bg-current opacity-55" />
        </div>
        <p className="text-[3.9cqw] font-semibold">{r.date}</p>
        {r.time && <p className="mt-[0.6cqw] text-[3.4cqw] opacity-85">{r.time}</p>}
        <p className="mt-[2.8cqw] text-[3.6cqw] font-semibold">{r.venue}</p>
        {r.address && <p className="mt-[0.5cqw] text-[2.9cqw] leading-snug opacity-75">{r.address}</p>}
        {r.message && <p className="mt-[3cqw] text-[3.2cqw] leading-relaxed opacity-90 text-balance">{r.message}</p>}
        {r.host && (
          <p className="mt-[3cqw] text-[3.1cqw] text-[var(--accent)]">
            {r.hi ? "निवेदक" : "Warm regards,"} <span className="font-semibold">{r.host}</span>
          </p>
        )}
      </div>
    </>
  );
}

/** The pointed arch of a temple or haveli doorway. */
function Arch({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 125" preserveAspectRatio="none" className={className} fill="none" aria-hidden>
      <path
        d="M2 123 V 46 C 2 22, 24 2, 50 2 C 76 2, 98 22, 98 46 V 123 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M6 119 V 47 C 6 25, 26 6, 50 6 C 74 6, 94 25, 94 47 V 119 Z"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="2 2.5"
        opacity=".65"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Paisley({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 36 C 2 28, 4 12, 18 6 C 30 1, 38 10, 34 20 C 31 28, 20 30, 17 24 C 15 19, 20 14, 25 16" />
      <circle cx="14" cy="30" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
