import { describe, expect, it } from "vitest";
import { OCCASIONS } from "./occasions";
import { PALETTE_IDS, PALETTES, TEMPLATES, TEMPLATE_IDS, galleryPalette, getPalette, palettesFor, templatesFor } from "./themes";

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

describe("palettesFor", () => {
  const ids = (occasion: string, current?: string) => palettesFor(occasion, current).map((p) => p.id);

  it("offers every colour under Navratri, because each one is a night", () => {
    expect(ids("navratri")).toEqual(PALETTES.map((p) => p.id));
  });

  it("keeps the weekday colours out of an ordinary occasion", () => {
    // Thirteen swatches under a birthday is choice with nothing bought by it.
    for (const weekdayOnly of ["pearl", "vermilion", "cobalt", "turmeric", "emerald", "slate"]) {
      expect(ids("birthday"), weekdayOnly).not.toContain(weekdayOnly);
    }
    expect(ids("birthday")).toEqual(["rose", "marigold", "mint", "sky", "royal", "peacock", "maroon"]);
  });

  it("still shows the colour an invite is already in", () => {
    // A host picks Cobalt for a Navratri card, then switches to a party, or
    // comes back to edit it next month. Dropping the swatch would leave the
    // row with nothing selected and look like the choice had been lost.
    expect(ids("party", "cobalt")).toContain("cobalt");
    expect(ids("party", "cobalt")).toHaveLength(8);
  });

  it("does not list the current colour twice", () => {
    const listed = ids("birthday", "rose");
    expect(listed.filter((id) => id === "rose")).toHaveLength(1);
  });

  it("ignores a colour that does not exist", () => {
    expect(ids("birthday", "chartreuse")).toEqual(ids("birthday"));
  });

  it("only ever returns real palettes", () => {
    for (const occasion of ["navratri", "birthday", "pooja"]) {
      for (const id of ids(occasion)) expect(PALETTE_IDS, occasion).toContain(id);
    }
  });
});
