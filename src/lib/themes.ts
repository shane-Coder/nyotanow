export type Lang = "en" | "hi";
export const LANGS = ["en", "hi"] as const;

export const TEMPLATES = [
  { id: "classic", name: "Elegant" },
  { id: "confetti", name: "Fun" },
  { id: "shubh", name: "Shubh" },
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
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]["id"];
export const PALETTE_IDS = PALETTES.map((p) => p.id) as [PaletteId, ...PaletteId[]];

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
