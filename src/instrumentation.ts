import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("../sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("../sentry.edge.config");
}

// Next hands every server-side render and Server Action error to this hook.
// Without it, a failing Server Action is only ever a console.error in a log
// Vercel keeps for about half an hour.
export const onRequestError = Sentry.captureRequestError;
