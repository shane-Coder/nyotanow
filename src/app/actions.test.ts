import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import type { InviteData } from "@/lib/invite";
import { MAX_YEARS_AHEAD, maxEventDate, todayInIST } from "@/lib/invite";

// Its own throwaway PGlite directory, set before the db module loads, exactly
// as the query tests do.
const dataDir = mkdtempSync(join(tmpdir(), "nyotanow-actions-"));
process.env.PGLITE_DIR = dataDir;
delete process.env.DATABASE_URL;

const { findInvite, insertInvite } = await import("@/db/queries");
const { updateInviteAction } = await import("./actions");

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
  placeLat: null,
  placeLng: null,
  message: "Come along",
  ...over,
});

/** The edit form's fields, as a browser would post them. */
function form(data: InviteData): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v === null ? "" : String(v));
  return fd;
}

/**
 * What the action did: the state it returned, or where it sent the host.
 *
 * `redirect()` reports success by throwing, so without this every passing
 * edit would look like a failed test. The destination rides along in the
 * error's digest.
 */
type Outcome = { state: Awaited<ReturnType<typeof updateInviteAction>> } | { redirectedTo: string };

async function outcome(run: Promise<Awaited<ReturnType<typeof updateInviteAction>>>): Promise<Outcome> {
  try {
    return { state: await run };
  } catch (err) {
    const digest = (err as { digest?: string })?.digest ?? "";
    if (!digest.startsWith("NEXT_REDIRECT")) throw err;
    return { redirectedTo: digest };
  }
}

describe("editing an invite", () => {
  it("refuses a date beyond the cap, the same as creating one does", async () => {
    // The year-8978 fix only closed the create door. The edit form does set
    // max= on the date input, but WebKit ignores it — which is the entire
    // reason that bug happened — so the server has to say no as well.
    const { slug, key } = await insertInvite(invite());
    const got = await outcome(updateInviteAction(slug, key, undefined, form(invite({ date: "8978-07-07" }))));

    expect(got).toHaveProperty("state");
    expect("state" in got && got.state?.fieldErrors?.date?.[0]).toContain(`within ${MAX_YEARS_AHEAD} years`);
    // And nothing was written.
    expect((await findInvite(slug))?.eventDate).toBe("2026-12-25");
  });

  it("still allows a date in the past", async () => {
    // Deliberate: a host tidying up details after the event is ordinary, and
    // the form only sets min= when creating. Refusing here would lock people
    // out of their own invitation the day after the party.
    const { slug, key } = await insertInvite(invite());
    const got = await outcome(updateInviteAction(slug, key, undefined, form(invite({ date: "2020-01-01" }))));

    expect("redirectedTo" in got && got.redirectedTo).toContain(`/i/${slug}/manage`);
    expect((await findInvite(slug))?.eventDate).toBe("2020-01-01");
  });

  it("allows the last date inside the cap", async () => {
    const latest = maxEventDate(todayInIST());
    const { slug, key } = await insertInvite(invite());
    const got = await outcome(updateInviteAction(slug, key, undefined, form(invite({ date: latest }))));

    expect("redirectedTo" in got && got.redirectedTo).toContain(`/i/${slug}/manage`);
    expect((await findInvite(slug))?.eventDate).toBe(latest);
  });

  it("says nothing useful to someone without the key", async () => {
    const { slug } = await insertInvite(invite());
    const got = await outcome(updateInviteAction(slug, "not-the-key", undefined, form(invite({ title: "Hijacked" }))));

    expect("state" in got && got.state?.error).toBe("This edit link is not valid anymore.");
    expect((await findInvite(slug))?.title).toBe("Test Party");
  });
});
