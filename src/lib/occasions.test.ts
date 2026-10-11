import { describe, expect, it } from "vitest";
import { OCCASIONS, getOccasion, sentenceName } from "./occasions";
import { PALETTE_IDS, TEMPLATE_IDS } from "./themes";

describe("the occasion list", () => {
  it("has no duplicate ids, which would make one of them unreachable", () => {
    const ids = OCCASIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only names designs and palettes that exist", () => {
    for (const o of OCCASIONS) {
      expect(TEMPLATE_IDS, o.id).toContain(o.template);
      expect(PALETTE_IDS, o.id).toContain(o.palette);
    }
  });

  it("gives every occasion both languages, with nothing left blank", () => {
    for (const o of OCCASIONS) {
      for (const field of [o.name, o.titlePlaceholder, o.hostPlaceholder, o.kicker, o.message]) {
        expect(field.en.trim(), o.id).not.toBe("");
        expect(field.hi.trim(), o.id).not.toBe("");
      }
    }
  });

  it("writes Hindi in Devanagari, not in Latin", () => {
    // A placeholder that reads "Durga Puja Mahotsav" in the Hindi slot is the
    // easy mistake here, and it looks wrong on the card rather than failing.
    for (const o of OCCASIONS) {
      expect(o.name.hi, o.id).toMatch(/\p{Script=Devanagari}/u);
      expect(o.message.hi, o.id).toMatch(/\p{Script=Devanagari}/u);
    }
  });
});

describe("sentenceName", () => {
  it("lowercases an ordinary noun", () => {
    expect(sentenceName(getOccasion("birthday")!)).toBe("birthday");
  });

  it("leaves a festival's capitals alone", () => {
    // "Create your navratri & durga puja invite" is what this exists to stop.
    expect(sentenceName(getOccasion("navratri")!)).toBe("Navratri & Durga Puja");
  });
});

describe("the Navratri occasion", () => {
  const navratri = getOccasion("navratri")!;

  it("exists and leads the grid during the festival", () => {
    expect(navratri).toBeDefined();
    expect(OCCASIONS[0].id).toBe("navratri");
  });

  it("speaks to a puja committee, not a family", () => {
    // A pandal is invited by a samiti. The other occasions default to a
    // family name, and that is the wrong word on this card.
    expect(navratri.hostPlaceholder.en).toContain("Samiti");
    expect(navratri.hostPlaceholder.hi).toContain("समिति");
  });
});
