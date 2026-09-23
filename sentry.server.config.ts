// Server runtime (Node). Loaded by src/instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No DSN means local development: stay completely silent.
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  // Errors are what we're here for. Tracing burns the free tier's quota fast
  // and tells us nothing we can't already see in Vercel Analytics.
  tracesSampleRate: 0,
  sendDefaultPii: false,
});
