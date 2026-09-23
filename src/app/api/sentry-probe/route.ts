import { createHash, timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";

// TEMPORARY. Four deliberate 500s reached Vercel's logs but never reached
// Sentry, so this now reports which link in the chain is broken:
//   env var -> Sentry.init -> client -> transport/flush -> onRequestError
// Delete this file once the wiring is confirmed.
//
// Gated behind STATS_KEY so a crawler or a stranger cannot make production
// throw: without the right key this is an ordinary 404.

export const dynamic = "force-dynamic";

function keyOk(given: string | null): boolean {
  const expected = process.env.STATS_KEY;
  if (!expected || !given) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!keyOk(new URL(request.url).searchParams.get("key"))) {
    return new Response("Not found", { status: 404 });
  }

  const client = Sentry.getClient();
  const options = client?.getOptions();
  // Only the tail of the DSN, so the log never carries the whole key.
  console.log(
    "SENTRY_PROBE_DIAG " +
      JSON.stringify({
        envDsnPresent: Boolean(process.env.SENTRY_DSN),
        envDsnTail: process.env.SENTRY_DSN?.slice(-10) ?? null,
        nextRuntime: process.env.NEXT_RUNTIME ?? null,
        clientInitialised: Boolean(client),
        clientDsnPresent: Boolean(options?.dsn),
        clientEnabled: options?.enabled ?? null,
      }),
  );

  // An explicit capture with an explicit flush. Serverless functions freeze the
  // moment the response is sent, so an event that has not been flushed never
  // leaves the machine.
  const eventId = Sentry.captureException(new Error("NyotaNow Sentry probe: explicit capture"));
  const flushed = await Sentry.flush(4000);
  console.log("SENTRY_PROBE_CAPTURE " + JSON.stringify({ eventId, flushed }));

  throw new Error("NyotaNow Sentry probe: this error is deliberate");
}
