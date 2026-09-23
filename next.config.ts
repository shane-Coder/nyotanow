import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at
  // runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The OG image route reads these with fs; make sure they ship with it.
  outputFileTracingIncludes: {
    "/i/[slug]/opengraph-image": ["./assets/fonts/**"],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Source maps are uploaded only when a build has a token; a local build
  // without one still succeeds, it just reports minified frames.
  silent: !process.env.CI,
  // Don't ship the .map files themselves to the browser.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
