import { describe, expect, it } from "vitest";
import { scrubSecrets, scrubUrl } from "./scrub";

describe("keeping secrets out of error reports", () => {
  it("redacts a host's edit key", () => {
    // The key in this URL is permanent access to an invite and its guest list.
    expect(scrubUrl("https://nyotanow.in/i/diwali-xyz12/manage?key=bt7wL7u4qVuunYha8mDP6aNU")).toBe(
      "https://nyotanow.in/i/diwali-xyz12/manage?key=%5Bredacted%5D",
    );
  });

  it("redacts the stats key", () => {
    expect(scrubUrl("/stats/unlock?key=JjUv1jwUdBsVmhFaSekGbBcDyyHQDVFr")).not.toContain("JjUv1jwUdBs");
  });

  it("works on a bare path, not only a full URL", () => {
    // Next reports request URLs both ways.
    expect(scrubUrl("/i/x/manage?key=abc123&new=1")).toBe("/i/x/manage?key=%5Bredacted%5D&new=1");
  });

  it("leaves everything else exactly as it was", () => {
    for (const url of [
      "https://nyotanow.in/i/diwali-xyz12",
      "https://nyotanow.in/create/birthday",
      "/api/places?q=Hotel%20Rajmahal",
      "no url at all",
      "",
    ]) {
      expect(scrubUrl(url), url).toBe(url);
    }
  });

  it("strips the query rather than risk it when the URL will not parse", () => {
    const out = scrubUrl("ht!tp://%%%?key=secretvalue");
    expect(out).not.toContain("secretvalue");
  });

  it("finds the key wherever it is buried in the event", () => {
    // A URL turns up in the request, in breadcrumbs and inside stack frames,
    // and it only has to survive in one of them to be filed in Sentry.
    const event = {
      request: { url: "https://nyotanow.in/i/x/manage?key=SUPERSECRET" },
      breadcrumbs: [{ data: { to: "/i/x/manage?key=SUPERSECRET" } }],
      exception: {
        values: [{ stacktrace: { frames: [{ filename: "/i/x/manage?key=SUPERSECRET" }] } }],
      },
    };
    expect(JSON.stringify(scrubSecrets(event as never))).not.toContain("SUPERSECRET");
  });

  it("does not choke on nulls, numbers or deep nesting", () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: "ok" } } } } } } } }, n: null, x: 5 };
    expect(() => scrubSecrets(deep as never)).not.toThrow();
  });
});
