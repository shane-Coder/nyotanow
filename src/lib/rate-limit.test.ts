import { describe, expect, it, vi } from "vitest";
import * as queries from "@/db/queries";
import { overGlobalCap } from "./rate-limit";

/**
 * The site-wide cap on venue lookups. Covered on its own because it is the
 * only limit here whose failure mode is money rather than noise, and because
 * it deliberately behaves the opposite way to every other limit in the file.
 */
describe("the global cap on venue lookups", () => {
  const atHit = (n: number) => vi.spyOn(queries, "hitRateLimit").mockResolvedValue(n);

  it("lets an ordinary day through", async () => {
    atHit(1);
    expect(await overGlobalCap("places")).toBe(false);
  });

  it("still allows the last call inside the cap", async () => {
    // Off by one here would cost a day of suggestions for nothing.
    atHit(2000);
    expect(await overGlobalCap("places")).toBe(false);
  });

  it("stops the first call past it", async () => {
    atHit(2001);
    expect(await overGlobalCap("places")).toBe(true);
  });

  it("counts everyone into one bucket, not one per caller", async () => {
    // The whole point: a hundred addresses each under their own limit is
    // exactly the attack the per-IP check cannot see.
    const spy = atHit(1);
    await overGlobalCap("places");
    const [, subject] = spy.mock.calls[0];
    expect(subject).toBe("all");
  });

  it("counts over a day, not an hour", async () => {
    const spy = atHit(1);
    await overGlobalCap("places");
    expect(spy.mock.calls[0][2]).toBe(60 * 60 * 24);
  });

  it("closes rather than opens when the counter itself fails", async () => {
    // Opposite of every other limit here. Those protect against nuisance, so
    // a broken limiter must not take the site down. This one protects against
    // spending, and the cost of being wrong is a plain text box.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(queries, "hitRateLimit").mockRejectedValue(new Error("db gone"));
    expect(await overGlobalCap("places")).toBe(true);
  });
});
