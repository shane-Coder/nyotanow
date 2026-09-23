import { describe, expect, it } from "vitest";
import { OCCASIONS } from "./occasions";
import { PALETTE_IDS, TEMPLATES, TEMPLATE_IDS, galleryPalette, getPalette, templatesFor } from "./themes";

describe("templatesFor", () => {
  it("offers every design for every occasion, just in a different order", () => {
    for (const o of OCCASIONS) {
      const ids = templatesFor(o.id);
      expect([...ids].sort()).toEqual([...TEMPLATE_IDS].sort());
    }
  });

  it("never repeats a design", () => {
    for (const o of OCCASIONS) {
      const ids = templatesFor(o.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("leads with confetti for a birthday and the arch for a pooja", () => {
    expect(templatesFor("birthday")[0]).toBe("confetti");
    expect(templatesFor("pooja")[0]).toBe("mehrab");
  });

  it("falls back to the declared order for an occasion it doesn't know", () => {
    expect(templatesFor("wedding-on-mars")).toEqual([...TEMPLATE_IDS]);
  });
});

describe("galleryPalette", () => {
  it("gives every design a real palette", () => {
    for (const id of TEMPLATE_IDS) {
      expect(PALETTE_IDS).toContain(galleryPalette(id));
    }
  });

  it("varies the palettes so the homepage row doesn't look like one card seven times", () => {
    const used = TEMPLATE_IDS.map(galleryPalette);
    expect(new Set(used).size).toBe(TEMPLATE_IDS.length);
  });
});

describe("palettes", () => {
  it("falls back to the first palette rather than crashing on an unknown id", () => {
    expect(getPalette("chartreuse").id).toBe("rose");
  });

  it("keeps template ids in step with the template list", () => {
    expect(TEMPLATE_IDS).toEqual(TEMPLATES.map((t) => t.id));
  });
});
