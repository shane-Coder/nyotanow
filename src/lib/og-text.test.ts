import { describe, expect, it } from "vitest";
import { svgSafeText } from "./og-text";

describe("text on its way into the preview image", () => {
  it("leaves an ordinary invitation alone", () => {
    expect(svgSafeText("Aarav's 5th Birthday")).toBe("Aarav's 5th Birthday");
  });

  // "Mom & Dad's 40th" is a real invitation. None of these can open a tag on
  // their own, so none of them are worth taking off a host's card.
  it("keeps ampersands, apostrophes and quotes", () => {
    expect(svgSafeText(`Mom & Dad's 40th "at home"`)).toBe(`Mom & Dad's 40th "at home"`);
  });

  it("takes out the characters that can open a tag", () => {
    expect(svgSafeText("<script>alert(1)</script>")).toBe("scriptalert(1)/script");
    expect(svgSafeText("Party <3")).toBe("Party 3");
  });

  it("takes out control characters", () => {
    expect(svgSafeText("Diwali\u0000 Party\u001b")).toBe("Diwali Party");
  });

  it("collapses runs of whitespace and trims", () => {
    expect(svgSafeText("  Griha    Pravesh \n Party  ")).toBe("Griha Pravesh Party");
  });

  it("leaves Devanagari untouched", () => {
    expect(svgSafeText("श्री दुर्गा पूजा महोत्सव")).toBe("श्री दुर्गा पूजा महोत्सव");
  });

  it("leaves emoji untouched", () => {
    expect(svgSafeText("Diwali 🪔 at ours")).toBe("Diwali 🪔 at ours");
  });

  // The case the caller has to handle: a title made only of markup passes a
  // length check, passes isLatin, and comes out of here with nothing left.
  it("can empty a title that was nothing but markup", () => {
    expect(svgSafeText("<>")).toBe("");
    expect(svgSafeText("<<>>")).toBe("");
  });

  it("never returns anything with an angle bracket in it", () => {
    const nasty = [
      "<svg onload=x>",
      "</text><script>fetch('//evil')</script>",
      "a<b>c</b>d",
      "<<nested>>",
      "नमस्ते <script>",
    ];
    for (const value of nasty) {
      expect(svgSafeText(value)).not.toMatch(/[<>]/);
    }
  });
});
