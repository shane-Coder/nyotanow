import { describe, expect, it } from "vitest";
import {
  FESTIVALS,
  NAVADURGA,
  NAVRATRI_NIGHTS,
  currentOrNextFestival,
  festivalOn,
  navratriDays,
  nightOn,
} from "./navratri";
import { PALETTE_IDS } from "./themes";

describe("the nine forms", () => {
  it("are nine, numbered one to nine in order", () => {
    expect(NAVADURGA).toHaveLength(NAVRATRI_NIGHTS);
    expect(NAVADURGA.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("open with Shailaputri and close with Siddhidatri", () => {
    // The fixed point of this whole file. If this ever changes, something is
    // very wrong somewhere else.
    expect(NAVADURGA[0].en).toBe("Shailaputri");
    expect(NAVADURGA[8].en).toBe("Siddhidatri");
  });

  it("name every goddess in Devanagari as well as Latin", () => {
    for (const d of NAVADURGA) {
      expect(d.hi, d.en).toMatch(/\p{Script=Devanagari}/u);
      expect(d.meaning.hi, d.en).toMatch(/\p{Script=Devanagari}/u);
      expect(d.meaning.en.trim(), d.en).not.toBe("");
    }
  });
});

describe("the colour of each night", () => {
  // The sequence published for the festival running as this was written.
  it("matches the panchang for Sharad 2026, which opened on a Sunday", () => {
    expect(navratriDays("2026-10-11").map((n) => n.palette)).toEqual([
      "marigold", // Sun — orange
      "pearl", // Mon — white
      "vermilion", // Tue — red
      "cobalt", // Wed — royal blue
      "turmeric", // Thu — yellow
      "emerald", // Fri — green
      "slate", // Sat — grey
      "royal", // repeat — purple
      "peacock", // repeat — peacock green
    ]);
  });

  it("gives a different sequence to Chaitra 2026, which opened on a Thursday", () => {
    // Same year, same nine goddesses, nine months apart. This is the whole
    // reason the colour is derived rather than stored against a goddess.
    const spring = navratriDays("2026-03-19").map((n) => n.palette);
    const autumn = navratriDays("2026-10-11").map((n) => n.palette);

    expect(spring.slice(0, 7)).toEqual(["turmeric", "emerald", "slate", "marigold", "pearl", "vermilion", "cobalt"]);
    expect(spring).not.toEqual(autumn);
  });

  it("never repeats a colour inside one festival", () => {
    for (const f of FESTIVALS) {
      const used = navratriDays(f.start).map((n) => n.palette);
      expect(new Set(used).size, f.start).toBe(NAVRATRI_NIGHTS);
    }
  });

  it("only names palettes that exist", () => {
    for (const f of FESTIVALS) {
      for (const n of navratriDays(f.start)) expect(PALETTE_IDS, n.palette).toContain(n.palette);
    }
  });
});

describe("the dates of each night", () => {
  it("runs nine consecutive days from Ghatasthapana", () => {
    const days = navratriDays("2026-10-11");
    expect(days.map((n) => n.date)).toEqual([
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
      "2026-10-19",
    ]);
  });

  it("crosses a month boundary without losing a day", () => {
    // Sharad 2027 opens on 30 September, so seven of its nine nights are in
    // October. Date maths that leaned on the day number would break here.
    const days = navratriDays("2027-09-30");
    expect(days[0].date).toBe("2027-09-30");
    expect(days[1].date).toBe("2027-10-01");
    expect(days[8].date).toBe("2027-10-08");
  });

  it("pairs each night with its own goddess", () => {
    for (const n of navratriDays("2026-10-11")) {
      expect(NAVADURGA[n.devi.day - 1].en).toBe(n.devi.en);
    }
  });
});

describe("the festival table", () => {
  it("is in date order, so picking the next one is just a scan", () => {
    const starts = FESTIVALS.map((f) => f.start);
    expect([...starts].sort()).toEqual(starts);
  });

  it("holds only real dates", () => {
    for (const f of FESTIVALS) {
      expect(f.start, f.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${f.start}T00:00:00Z`).toISOString().slice(0, 10)).toBe(f.start);
    }
  });
});

describe("finding the festival to show", () => {
  it("knows a date inside the festival, at both ends", () => {
    expect(festivalOn("2026-10-11")?.start).toBe("2026-10-11");
    expect(festivalOn("2026-10-19")?.start).toBe("2026-10-11");
  });

  it("knows a date just outside it", () => {
    expect(festivalOn("2026-10-10")).toBeNull();
    // Dussehra is the day after the ninth night, not part of it.
    expect(festivalOn("2026-10-20")).toBeNull();
  });

  it("counts which night today is", () => {
    expect(nightOn("2026-10-11")).toBe(1);
    expect(nightOn("2026-10-15")).toBe(5);
    expect(nightOn("2026-10-19")).toBe(9);
    expect(nightOn("2026-10-20")).toBeNull();
  });

  it("shows the running festival while it is running", () => {
    expect(currentOrNextFestival("2026-10-15")?.start).toBe("2026-10-11");
  });

  it("looks forward once it is over", () => {
    expect(currentOrNextFestival("2026-10-21")?.start).toBe("2027-04-07");
  });

  it("returns nothing once the table runs out", () => {
    // Not a failure: the page falls back to the nine goddesses without
    // dates, which is the honest thing to show for a year nobody has
    // looked up yet.
    expect(currentOrNextFestival("2099-01-01")).toBeNull();
  });
});
