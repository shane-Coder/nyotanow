import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { InviteData } from "@/lib/invite";

// A throwaway PGlite directory per run, set before the db module is imported
// so getDb() picks it up. DATABASE_URL must be unset or it would reach for a
// real Postgres instead.
const dataDir = mkdtempSync(join(tmpdir(), "nyotanow-test-"));
process.env.PGLITE_DIR = dataDir;
delete process.env.DATABASE_URL;

const {
  comingCount,
  findInvite,
  getStats,
  hitRateLimit,
  insertInvite,
  keyMatches,
  listRsvps,
  pruneRateLimits,
  recordView,
  saveRsvp,
  updateInvite,
} = await import("./queries");

afterAll(() => rmSync(dataDir, { recursive: true, force: true }));

const invite = (over: Partial<InviteData> = {}): InviteData => ({
  occasion: "birthday",
  template: "confetti",
  palette: "rose",
  lang: "en",
  kicker: "You are invited to",
  title: "Test Party",
  hostedBy: "Host",
  date: "2026-12-25",
  time: "18:00",
  venue: "Test Hall",
  address: "Somewhere",
  message: "Come along",
  ...over,
});

describe("migrations", () => {
  it("bring up a usable schema from nothing", async () => {
    // If any migration in the chain were broken, this first insert would throw.
    const { slug } = await insertInvite(invite());
    expect(await findInvite(slug)).toBeDefined();
  });
});

describe("insertInvite", () => {
  it("builds the slug from the title and adds a random suffix", async () => {
    const { slug } = await insertInvite(invite({ title: "Diwali Dinner" }));
    expect(slug).toMatch(/^diwali-dinner-[a-z0-9]{5}$/);
  });

  it("gives two invites with the same title different links", async () => {
    const a = await insertInvite(invite({ title: "Same Name" }));
    const b = await insertInvite(invite({ title: "Same Name" }));
    expect(a.slug).not.toBe(b.slug);
  });

  it("returns a secret long enough to be unguessable", async () => {
    const { key } = await insertInvite(invite());
    expect(key).toHaveLength(24);
  });

  it("stores only a hash of the key, never the key itself", async () => {
    const { slug, key } = await insertInvite(invite());
    const row = await findInvite(slug);
    expect(row!.editKeyHash).not.toBe(key);
    expect(row!.editKeyHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("records where the host came from", async () => {
    const { slug } = await insertInvite(invite(), "invite");
    expect((await findInvite(slug))!.source).toBe("invite");
  });

  it("defaults the source to empty for a direct visitor", async () => {
    const { slug } = await insertInvite(invite());
    expect((await findInvite(slug))!.source).toBe("");
  });
});

describe("keyMatches", () => {
  it("accepts the host own key", async () => {
    const { slug, key } = await insertInvite(invite());
    expect(keyMatches((await findInvite(slug))!, key)).toBe(true);
  });

  it("rejects a wrong key", async () => {
    const { slug } = await insertInvite(invite());
    expect(keyMatches((await findInvite(slug))!, "x".repeat(24))).toBe(false);
  });

  it("rejects a missing key instead of letting it through", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    expect(keyMatches(row, undefined)).toBe(false);
    expect(keyMatches(row, null)).toBe(false);
    expect(keyMatches(row, "")).toBe(false);
  });

  it("rejects a key of the wrong length without throwing", async () => {
    const { slug } = await insertInvite(invite());
    expect(keyMatches((await findInvite(slug))!, "short")).toBe(false);
  });
});

describe("findInvite", () => {
  it("returns nothing for a slug that does not exist", async () => {
    expect(await findInvite("no-such-invite-aaaaa")).toBeUndefined();
  });
});

describe("updateInvite", () => {
  it("saves the host edits", async () => {
    const { slug } = await insertInvite(invite({ title: "Before" }));
    const row = (await findInvite(slug))!;
    await updateInvite(row.id, invite({ title: "After", venue: "New Hall" }));
    const after = (await findInvite(slug))!;
    expect(after.title).toBe("After");
    expect(after.venue).toBe("New Hall");
  });

  it("keeps the same link so already-shared invites do not break", async () => {
    const { slug } = await insertInvite(invite({ title: "Keep My Link" }));
    const row = (await findInvite(slug))!;
    await updateInvite(row.id, invite({ title: "Totally Different Title" }));
    expect((await findInvite(slug))!.slug).toBe(slug);
  });
});

describe("saveRsvp", () => {
  it("records a guest reply", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await saveRsvp(row.id, { name: "Asha", status: "yes", guests: 3, note: "" });
    const [saved] = await listRsvps(row.id);
    expect(saved.name).toBe("Asha");
    expect(saved.guests).toBe(3);
  });

  it("overwrites the earlier reply when a guest changes their mind", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    const id = await saveRsvp(row.id, { name: "Ravi", status: "yes", guests: 2, note: "" });
    const again = await saveRsvp(row.id, { name: "Ravi", status: "no", guests: 1, note: "" }, id);
    expect(again).toBe(id);
    const all = await listRsvps(row.id);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("no");
  });

  it("ignores a replaces id belonging to a different invite", async () => {
    const a = (await findInvite((await insertInvite(invite())).slug))!;
    const b = (await findInvite((await insertInvite(invite())).slug))!;
    const idOnA = await saveRsvp(a.id, { name: "Guest", status: "yes", guests: 1, note: "" });
    await saveRsvp(b.id, { name: "Intruder", status: "yes", guests: 1, note: "" }, idOnA);
    // A reply must survive untouched, and B gets its own new row.
    expect((await listRsvps(a.id))[0].name).toBe("Guest");
    expect(await listRsvps(b.id)).toHaveLength(1);
  });

  it("ignores a malformed replaces id rather than crashing", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await saveRsvp(row.id, { name: "X", status: "yes", guests: 1, note: "" }, "not-a-uuid");
    expect(await listRsvps(row.id)).toHaveLength(1);
  });

  it("forces the headcount to one when a guest says they cannot come", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await saveRsvp(row.id, { name: "Busy", status: "no", guests: 8, note: "" });
    expect((await listRsvps(row.id))[0].guests).toBe(1);
  });
});

describe("comingCount", () => {
  it("adds up the guests only from people who said yes", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await saveRsvp(row.id, { name: "A", status: "yes", guests: 4, note: "" });
    await saveRsvp(row.id, { name: "B", status: "yes", guests: 2, note: "" });
    await saveRsvp(row.id, { name: "C", status: "maybe", guests: 5, note: "" });
    await saveRsvp(row.id, { name: "D", status: "no", guests: 1, note: "" });
    expect(await comingCount(row.id)).toBe(6);
  });

  it("is zero, not null, for an invite nobody has answered", async () => {
    const { slug } = await insertInvite(invite());
    expect(await comingCount((await findInvite(slug))!.id)).toBe(0);
  });
});

describe("recordView", () => {
  it("counts each view", async () => {
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await recordView(row.id);
    await recordView(row.id);
    expect((await findInvite(slug))!.viewCount).toBe(2);
  });
});

describe("rate limiting", () => {
  it("counts hits within one window", async () => {
    const who = `ip-${Math.random()}`;
    expect(await hitRateLimit("create", who, 3600)).toBe(1);
    expect(await hitRateLimit("create", who, 3600)).toBe(2);
    expect(await hitRateLimit("create", who, 3600)).toBe(3);
  });

  it("keeps separate counts per caller", async () => {
    const a = `ip-${Math.random()}`;
    const b = `ip-${Math.random()}`;
    await hitRateLimit("create", a, 3600);
    await hitRateLimit("create", a, 3600);
    expect(await hitRateLimit("create", b, 3600)).toBe(1);
  });

  it("keeps separate counts per action", async () => {
    const who = `ip-${Math.random()}`;
    await hitRateLimit("create", who, 3600);
    expect(await hitRateLimit("rsvp", who, 3600)).toBe(1);
  });

  it("keeps separate counts per window length", async () => {
    const who = `ip-${Math.random()}`;
    await hitRateLimit("create", who, 3600);
    expect(await hitRateLimit("create", who, 86400)).toBe(1);
  });

  it("loses no hits when requests arrive at the same moment", async () => {
    // The whole point of doing this in one atomic statement: a read-then-write
    // limiter would undercount here and let a burst straight through.
    const who = `ip-${Math.random()}`;
    const results = await Promise.all(Array.from({ length: 40 }, () => hitRateLimit("create", who, 3600)));
    expect(Math.max(...results)).toBe(40);
    expect(new Set(results).size).toBe(40);
  });

  it("leaves the current window alone when pruning old ones", async () => {
    const who = `ip-${Math.random()}`;
    await hitRateLimit("create", who, 3600);
    await pruneRateLimits();
    expect(await hitRateLimit("create", who, 3600)).toBe(2);
  });
});

describe("getStats", () => {
  it("counts invites that came from another invite footer", async () => {
    const before = await getStats();
    await insertInvite(invite(), "invite");
    await insertInvite(invite());
    const after = await getStats();
    expect(after.invites - before.invites).toBe(2);
    expect(after.invitesFromInvites - before.invitesFromInvites).toBe(1);
  });

  it("reports guests coming, not just the number of replies", async () => {
    const before = await getStats();
    const { slug } = await insertInvite(invite());
    const row = (await findInvite(slug))!;
    await saveRsvp(row.id, { name: "A", status: "yes", guests: 5, note: "" });
    const after = await getStats();
    expect(after.rsvps - before.rsvps).toBe(1);
    expect(after.guestsComing - before.guestsComing).toBe(5);
  });

  it("always returns a full fourteen-day chart, gaps included", async () => {
    const { daily } = await getStats();
    expect(daily).toHaveLength(14);
    expect(daily.every((d) => typeof d.invites === "number")).toBe(true);
  });
});
