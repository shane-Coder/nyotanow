import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships WASM + data files that must be loaded from node_modules at
  // runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The OG image route reads these with fs; make sure they ship with it.
  outputFileTracingIncludes: {
    "/i/[slug]/opengraph-image": ["./assets/fonts/**"],
  },
};

export default nextConfig;
