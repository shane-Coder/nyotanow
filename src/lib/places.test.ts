import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_QUERY, placesEnabled, searchPlaces, toSuggestions } from "./places";

describe("venue suggestions", () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  describe("the off switch", () => {
    it("is off with no key configured", () => {
      delete process.env.OLA_MAPS_API_KEY;
      expect(placesEnabled()).toBe(false);
    });

    it("is on once a key exists", () => {
      process.env.OLA_MAPS_API_KEY = "k";
      expect(placesEnabled()).toBe(true);
    });

    it("never calls out when there is no key", async () => {
      // This is what keeps local development, CI and these tests offline.
      delete process.env.OLA_MAPS_API_KEY;
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      expect(await searchPlaces("Hotel Rajmahal")).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("reading a response", () => {
    it("splits a prediction into a venue name and an address", () => {
      // The whole reason for using the structured fields: the venue box should
      // hold "Hotel Rajmahal", not the full postal address.
      const [s] = toSuggestions({
        predictions: [
          {
            description: "Hotel Rajmahal, Station Rd, Gaya, Bihar",
            structured_formatting: { main_text: "Hotel Rajmahal", secondary_text: "Station Rd, Gaya, Bihar" },
            geometry: { location: { lat: 24.7955, lng: 85.0002 } },
          },
        ],
      });
      expect(s).toEqual({
        name: "Hotel Rajmahal",
        address: "Station Rd, Gaya, Bihar",
        lat: 24.7955,
        lng: 85.0002,
      });
    });

    it("keeps a suggestion that has no coordinates", () => {
      // Still worth offering: it fills the name and address for the host.
      const [s] = toSuggestions({
        predictions: [{ structured_formatting: { main_text: "Rose Garden Hall", secondary_text: "Patna" } }],
      });
      expect(s.name).toBe("Rose Garden Hall");
      expect(s.lat).toBeNull();
      expect(s.lng).toBeNull();
    });

    it("falls back to the description when nothing is structured", () => {
      const [s] = toSuggestions({ predictions: [{ description: "Funcity Play Zone, Noida" }] });
      expect(s.name).toBe("Funcity Play Zone, Noida");
      expect(s.address).toBe("");
    });

    it("drops a prediction with no usable name rather than showing a blank row", () => {
      expect(toSuggestions({ predictions: [{ geometry: { location: { lat: 1, lng: 2 } } }, { description: "" }] })).toEqual(
        [],
      );
    });

    it("survives a response shaped like nothing we expected", () => {
      // A provider changing its output must degrade to a plain text box, not
      // throw on the server while a host is typing.
      for (const junk of [null, undefined, {}, [], "nope", { predictions: "nope" }, { predictions: [null] }]) {
        expect(() => toSuggestions(junk)).not.toThrow();
        expect(toSuggestions(junk)).toEqual([]);
      }
    });

    it("ignores coordinates that are not numbers", () => {
      const [s] = toSuggestions({
        predictions: [{ description: "Somewhere", geometry: { location: { lat: "24.79", lng: null } } }],
      });
      expect(s.lat).toBeNull();
      expect(s.lng).toBeNull();
    });

    it("caps how many it offers", () => {
      const many = { predictions: Array.from({ length: 30 }, (_, i) => ({ description: `Place ${i}` })) };
      expect(toSuggestions(many)).toHaveLength(6);
    });
  });

  describe("calling out", () => {
    beforeEach(() => {
      process.env.OLA_MAPS_API_KEY = "test-key";
    });

    it("asks for nothing shorter than the minimum", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      expect(await searchPlaces("ho")).toEqual([]);
      expect(await searchPlaces("   ")).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(MIN_QUERY).toBe(3);
    });

    it("sends the query and the key", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ predictions: [{ description: "Hotel Rajmahal" }] }), { status: 200 }),
      );
      await searchPlaces("  Hotel Rajmahal  ");
      const url = new URL(String(fetchSpy.mock.calls[0][0]));
      expect(url.searchParams.get("input")).toBe("Hotel Rajmahal");
      expect(url.searchParams.get("api_key")).toBe("test-key");
    });

    it("returns nothing when the provider errors", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("over quota", { status: 429 }));
      expect(await searchPlaces("Hotel Rajmahal")).toEqual([]);
    });

    it("returns nothing when the provider is unreachable", async () => {
      // A host typing a venue must never see the form break because a map
      // provider is down.
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ECONNRESET"));
      await expect(searchPlaces("Hotel Rajmahal")).resolves.toEqual([]);
    });

    it("returns nothing when the body is not JSON", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>502</html>", { status: 200 }));
      await expect(searchPlaces("Hotel Rajmahal")).resolves.toEqual([]);
    });

    it("never puts the key in a log line", async () => {
      const logged: unknown[] = [];
      vi.spyOn(console, "error").mockImplementation((...args) => void logged.push(...args));
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("denied", { status: 403 }));
      await searchPlaces("Hotel Rajmahal");
      expect(JSON.stringify(logged)).not.toContain("test-key");
    });
  });
});
