import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agoLabel, fetchSentryIssues, toIssue } from "./sentry-issues";

const RAW = {
  id: "6543210",
  shortId: "JAVASCRIPT-NEXTJS-1",
  title: "NyotaNow Sentry probe: this error is deliberate",
  culprit: "GET /api/sentry-probe",
  count: "12",
  userCount: "3",
  lastSeen: "2026-09-23T14:35:42Z",
  level: "error",
  permalink: "https://saro-m6.sentry.io/issues/6543210/",
};

describe("toIssue", () => {
  it("reads a normal Sentry issue", () => {
    expect(toIssue(RAW)).toEqual({
      id: "6543210",
      shortId: "JAVASCRIPT-NEXTJS-1",
      title: "NyotaNow Sentry probe: this error is deliberate",
      culprit: "GET /api/sentry-probe",
      count: 12,
      userCount: 3,
      lastSeen: "2026-09-23T14:35:42Z",
      level: "error",
      permalink: "https://saro-m6.sentry.io/issues/6543210/",
    });
  });

  it("turns Sentry's string counts into numbers so the table can align them", () => {
    const i = toIssue(RAW)!;
    expect(typeof i.count).toBe("number");
    expect(typeof i.userCount).toBe("number");
  });

  it("survives an issue missing everything except an id", () => {
    expect(toIssue({ id: "1" })).toMatchObject({ id: "1", title: "Unknown error", count: 0 });
  });

  it("drops anything without an id rather than rendering a blank row", () => {
    expect(toIssue({ title: "no id" })).toBeNull();
    expect(toIssue(null)).toBeNull();
    expect(toIssue("nope")).toBeNull();
  });
});

describe("agoLabel", () => {
  const now = new Date("2026-09-23T15:00:00Z");

  it("uses minutes, then hours, then days", () => {
    expect(agoLabel("2026-09-23T14:57:00Z", now)).toBe("3m");
    expect(agoLabel("2026-09-23T10:00:00Z", now)).toBe("5h");
    expect(agoLabel("2026-09-21T15:00:00Z", now)).toBe("2d");
  });

  it("returns nothing for a missing or unparseable date", () => {
    expect(agoLabel("", now)).toBe("");
    expect(agoLabel("not a date", now)).toBe("");
  });

  it("never shows a negative age for a clock slightly ahead", () => {
    expect(agoLabel("2026-09-23T15:00:30Z", now)).toBe("0m");
  });
});

describe("fetchSentryIssues", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.SENTRY_ORG = "saro-m6";
    process.env.SENTRY_PROJECT = "javascript-nextjs";
    process.env.SENTRY_AUTH_TOKEN = "sntrys_test";
  });

  afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
  });

  it("stays off when it isn't configured, instead of erroring", async () => {
    delete process.env.SENTRY_AUTH_TOKEN;
    expect(await fetchSentryIssues()).toEqual({ state: "off" });
  });

  it("sends the token as a bearer and asks only for unresolved issues", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([RAW]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const feed = await fetchSentryIssues();
    expect(feed).toMatchObject({ state: "ok" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/projects/saro-m6/javascript-nextjs/issues/");
    expect(String(url)).toContain("is%3Aunresolved");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sntrys_test");
  });

  it("explains a rejected token rather than showing a bare 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));
    const feed = await fetchSentryIssues();
    expect(feed).toEqual({ state: "error", message: "token rejected — check it has the event:read scope" });
  });

  it("explains a wrong org or project name", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    const feed = await fetchSentryIssues();
    expect(feed).toMatchObject({ state: "error", message: expect.stringContaining("SENTRY_ORG") });
  });

  it("reports a network failure instead of taking the stats page down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    expect(await fetchSentryIssues()).toEqual({ state: "error", message: "could not reach Sentry" });
  });

  it("reports a timeout in its own words", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const timeout = Object.assign(new Error("timed out"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));
    expect(await fetchSentryIssues()).toEqual({ state: "error", message: "Sentry timed out" });
  });

  it("rejects a response that isn't a list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "nope" }), { status: 200 })));
    expect(await fetchSentryIssues()).toEqual({ state: "error", message: "unexpected response shape" });
  });

  it("skips malformed entries but keeps the good ones", async () => {
    const body = JSON.stringify([RAW, { title: "no id" }, null]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const feed = await fetchSentryIssues();
    expect(feed.state === "ok" && feed.issues).toHaveLength(1);
  });
});
