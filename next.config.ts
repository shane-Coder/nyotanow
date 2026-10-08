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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // A host's manage link carries their edit key in the query string.
          // Without this, the first external link added to that page would
          // hand the key to whoever was linked to, in the Referer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Stops an invite being framed inside someone else's page, where the
          // RSVP buttons could be hidden under something else.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing here needs a camera, a microphone or a location.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
      {
        // Belt and braces: nothing linked from the private page should be able
        // to learn where the click came from.
        source: "/stats/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
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
