import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/..." paths from tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // The database tests run a real PGlite instance, which locks its data
    // directory, so test files take turns rather than running in parallel.
    fileParallelism: false,
    // The first database test pays for booting PGlite (Postgres compiled to
    // WebAssembly) and running every migration, which is several seconds on a
    // spinning disk. The default 5s fails there and nowhere else.
    testTimeout: 30_000,
  },
});
