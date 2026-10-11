export type Lang = "en" | "hi";
export const LANGS = ["en", "hi"] as const;

export const TEMPLATES = [
  { id: "classic", name: "Elegant" },
  { id: "confetti", name: "Fun" },
  { id: "shubh", name: "Shubh" },
  { id: "botanical", name: "Botanical" },
  { id: "minimal", name: "Minimal" },
  { id: "poster", name: "Poster" },
  { id: "mehrab", name: "Mehrab" },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]["id"];
export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [TemplateId, ...TemplateId[]];

export type Palette = {
  id: string;
  name: string;
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
  soft: string;
  dark: boolean;
};

export const PALETTES = [
  { id: "rose", name: "Rose", bg: "#fff1f3", bg2: "#ffd3dd", ink: "#4a1022", accent: "#e11d48", soft: "#fecdd3", dark: false },
  { id: "marigold", name: "Marigold", bg: "#fff8e6", bg2: "#ffd98a", ink: "#4a2a00", accent: "#d97706", soft: "#fde68a", dark: false },
  { id: "mint", name: "Mint", bg: "#effcf6", bg2: "#c6f2dc", ink: "#0f3d2e", accent: "#0f9960", soft: "#bbf0d6", dark: false },
  { id: "sky", name: "Sky", bg: "#eef6ff", bg2: "#cfe3ff", ink: "#10284a", accent: "#2f6fe4", soft: "#cfe0fb", dark: false },
  { id: "royal", name: "Royal", bg: "#1e1036", bg2: "#3b1d6e", ink: "#fdf4dc", accent: "#e8b84a", soft: "#4c2a85", dark: true },
  { id: "peacock", name: "Peacock", bg: "#062c30", bg2: "#0b4f55", ink: "#f0fdfa", accent: "#f2c14e", soft: "#115e67", dark: true },
  { id: "maroon", name: "Maroon", bg: "#3a0a12", bg2: "#6b1020", ink: "#fff3e0", accent: "#f0b429", soft: "#5a1420", dark: true },
  // The six below complete the Navratri weekday colours. Sunday's orange is
  // marigold, Monday's purple is royal and the ninth night's peacock green is
  // peacock; these fill the gaps in between. They are ordinary palettes, so
  // any invite can use them — a griha pravesh in cobalt is nobody's business
  // but the host's.
  { id: "pearl", name: "Pearl", bg: "#fffdf8", bg2: "#f0e7d6", ink: "#3b3326", accent: "#a8842c", soft: "#efe5d2", dark: false },
  { id: "vermilion", name: "Vermilion", bg: "#fff4f1", bg2: "#ffd2c6", ink: "#4d1407", accent: "#d93a16", soft: "#ffc8b8", dark: false },
  { id: "cobalt", name: "Cobalt", bg: "#0a1d3d", bg2: "#17366d", ink: "#eaf2ff", accent: "#efbe55", soft: "#1e4182", dark: true },
  { id: "turmeric", name: "Turmeric", bg: "#fffbe8", bg2: "#ffeaa3", ink: "#473600", accent: "#bd8b00", soft: "#fdeeb4", dark: false },
  { id: "emerald", name: "Emerald", bg: "#04281a", bg2: "#0a4a2f", ink: "#effdf4", accent: "#e0b03a", soft: "#0e5a3a", dark: true },
  { id: "slate", name: "Slate", bg: "#1b1b20", bg2: "#34343c", ink: "#f4f4f6", accent: "#c6a04a", soft: "#292930", dark: true },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]["id"];
export const PALETTE_IDS = PALETTES.map((p) => p.id) as [PaletteId, ...PaletteId[]];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/**
 * Which designs to show first for each occasion. Every template still works
 * for every occasion; this only changes the order, so a birthday host is not
 * greeted by a temple arch and a griha pravesh host is not greeted by confetti.
 * Anything left out follows in the order declared above.
 */
const PREFERRED: Record<string, readonly TemplateId[]> = {
  navratri: ["mehrab", "shubh", "poster"],
  birthday: ["confetti", "poster", "botanical"],
  anniversary: ["classic", "botanical", "minimal"],
  "griha-pravesh": ["shubh", "mehrab", "classic"],
  "baby-shower": ["botanical", "confetti", "minimal"],
  pooja: ["mehrab", "shubh", "classic"],
  party: ["poster", "confetti", "minimal"],
};

export function templatesFor(occasion: string): readonly TemplateId[] {
  const first = PREFERRED[occasion] ?? [];
  return [...first, ...TEMPLATE_IDS.filter((id) => !first.includes(id))];
}

/**
 * The palette each template is shown with in the design gallery. Picked so the
 * grid reads as distinct designs rather than the same card seven times.
 */
const GALLERY_PALETTE: Record<TemplateId, PaletteId> = {
  classic: "royal",
  confetti: "rose",
  shubh: "maroon",
  botanical: "mint",
  minimal: "sky",
  poster: "marigold",
  mehrab: "peacock",
};

export function galleryPalette(template: TemplateId): PaletteId {
  return GALLERY_PALETTE[template];
}
