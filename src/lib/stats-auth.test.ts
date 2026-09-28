import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STATS_COOKIE, cookieOk, cookieValue, keyOk } from "./stats-auth";

const KEY = "D-Zt1RjFlH4guWgeGGH_bLdx";

describe("stats access", () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.STATS_KEY = KEY;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it("names the cookie something recognisable", () => {
    expect(STATS_COOKIE).toBe("nyota_stats");
  });

  describe("keyOk", () => {
    it("accepts the configured key", () => {
      expect(keyOk(KEY)).toBe(true);
    });

    it("rejects a wrong key", () => {
      expect(keyOk("not-the-key")).toBe(false);
    });

    it("rejects a missing key rather than letting it through", () => {
      expect(keyOk("")).toBe(false);
      expect(keyOk(null)).toBe(false);
      expect(keyOk(undefined)).toBe(false);
    });

    it("stays shut when no key is configured at all", () => {
      // Otherwise a forgotten env var would publish the dashboard.
      delete process.env.STATS_KEY;
      expect(keyOk(KEY)).toBe(false);
      expect(keyOk("")).toBe(false);
    });
  });

  describe("cookieValue", () => {
    it("is a digest, never the key itself", () => {
      const v = cookieValue()!;
      expect(v).not.toContain(KEY);
      expect(v).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is null when nothing is configured", () => {
      delete process.env.STATS_KEY;
      expect(cookieValue()).toBeNull();
    });
  });

  describe("cookieOk", () => {
    it("accepts the cookie it issued", () => {
      expect(cookieOk(cookieValue())).toBe(true);
    });

    it("rejects the raw key pasted in as a cookie", () => {
      // The whole point of storing a digest: a leaked cookie is not the key.
      expect(cookieOk(KEY)).toBe(false);
    });

    it("rejects a cookie issued under a previous key", () => {
      // Rotation should log everyone out without any extra bookkeeping.
      const old = cookieValue()!;
      process.env.STATS_KEY = "a-completely-different-secret";
      expect(cookieOk(old)).toBe(false);
    });

    it("rejects junk without throwing on odd-length hex", () => {
      expect(cookieOk("abc")).toBe(false);
      expect(cookieOk("zzzz")).toBe(false);
      expect(cookieOk("")).toBe(false);
      expect(cookieOk(undefined)).toBe(false);
    });

    it("stays shut when no key is configured", () => {
      const v = cookieValue()!;
      delete process.env.STATS_KEY;
      expect(cookieOk(v)).toBe(false);
    });
  });
});
