import { describe, expect, it } from "vitest";
import { mapLinkIn, withoutMapLink } from "./map-link";

describe("pasted map links", () => {
  describe("what counts as a map", () => {
    it("recognises the share links people actually paste", () => {
      // The one from the invite that prompted all this.
      expect(mapLinkIn("https://share.google/Sbi9kwLonhxU18GED")).toBe("https://share.google/Sbi9kwLonhxU18GED");
      for (const url of [
        "https://maps.app.goo.gl/abc123",
        "https://maps.google.com/?q=28.6,77.2",
        "https://maps.google.co.in/?q=28.6,77.2",
        "https://www.google.com/maps/place/Hotel+Rajmahal",
        "https://google.co.in/maps/@28.6,77.2,15z",
        "https://goo.gl/maps/xyz",
        "https://maps.apple.com/?ll=28.6,77.2",
        "https://www.openstreetmap.org/#map=18/28.6/77.2",
        "https://bing.com/maps?cp=28.6~77.2",
      ]) {
        expect(mapLinkIn(url), url).toBe(url);
      }
    });

    it("finds the link inside the rest of the host's text", () => {
      expect(mapLinkIn("Behind the Shiv Mandir, https://share.google/abc12 — ring the bell")).toBe(
        "https://share.google/abc12",
      );
    });

    it("looks across both the venue and the address", () => {
      expect(mapLinkIn("Hotel Rajmahal", "https://maps.app.goo.gl/abc")).toBe("https://maps.app.goo.gl/abc");
      expect(mapLinkIn("https://maps.app.goo.gl/abc", "Gaya")).toBe("https://maps.app.goo.gl/abc");
    });

    it("finds nothing in ordinary text", () => {
      expect(mapLinkIn("B-204, Green Valley")).toBeNull();
      expect(mapLinkIn("")).toBeNull();
      expect(mapLinkIn(null, undefined)).toBeNull();
    });
  });

  describe("what must never become a link", () => {
    // This is the security boundary. Anyone can make an invite, invites get
    // forwarded around WhatsApp, and every one carries "Made with NyotaNow"
    // as a reason to trust it.
    it("refuses a plain link to anywhere else", () => {
      for (const url of [
        "https://evil.example/pay-now",
        "https://bit.ly/3xYz",
        "https://nyotanow.in.evil.example/i/x",
      ]) {
        expect(mapLinkIn(url), url).toBeNull();
      }
    });

    it("refuses a lookalike host", () => {
      // The check must be on the host, not on the string containing "google".
      for (const url of [
        "https://google.com.evil.example/maps",
        "https://notgoogle.com/maps",
        "https://share.google.evil.example/abc",
        "https://maps.apple.com.evil.example/x",
        "https://evil.example/https://share.google/abc",
      ]) {
        expect(mapLinkIn(url), url).toBeNull();
      }
    });

    it("refuses Google's open redirector", () => {
      // google.com serves far more than maps, and /url?q= will forward a
      // guest anywhere at all. Host alone is not enough.
      expect(mapLinkIn("https://www.google.com/url?q=https://evil.example")).toBeNull();
      expect(mapLinkIn("https://google.com/search?q=anything")).toBeNull();
      expect(mapLinkIn("https://goo.gl/notmaps")).toBeNull();
      expect(mapLinkIn("https://bing.com/search?q=x")).toBeNull();
    });

    it("refuses a path that only looks like /maps", () => {
      expect(mapLinkIn("https://google.com/mapsomething")).toBeNull();
    });

    it("refuses anything that is not https", () => {
      expect(mapLinkIn("http://share.google/abc12")).toBeNull();
      expect(mapLinkIn("javascript:alert(1)")).toBeNull();
      expect(mapLinkIn("data:text/html,<script>alert(1)</script>")).toBeNull();
    });
  });

  describe("keeping the card clean", () => {
    it("takes a recognised link off the card", () => {
      expect(withoutMapLink("https://share.google/Sbi9kwLonhxU18GED")).toBe("");
      expect(withoutMapLink("Behind the Shiv Mandir, https://share.google/abc12")).toBe("Behind the Shiv Mandir");
    });

    it("leaves a link we did not recognise alone", () => {
      // It is the host's own words. Deleting a guest's only clue to the venue
      // would be worse than printing something ugly.
      expect(withoutMapLink("See https://evil.example/x")).toBe("See https://evil.example/x");
    });

    it("leaves ordinary text untouched", () => {
      for (const text of ["B-204, Green Valley", "Hotel Rajmahal", "", "श्री राम मंदिर"]) {
        expect(withoutMapLink(text)).toBe(text);
      }
    });

    it("does not leave the punctuation that joined the link on", () => {
      expect(withoutMapLink("Gaya, https://share.google/abc12")).toBe("Gaya");
      expect(withoutMapLink("https://share.google/abc12 - Gaya")).toBe("Gaya");
    });
  });
});
