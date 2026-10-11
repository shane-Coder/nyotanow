/**
 * Which deployment this is: the real site, a test one, or a laptop.
 *
 * nyotanow.in is the product. Everything else — preview deployments and the
 * nyotanow.vercel.app alias — is for trying things out, and the two must not
 * be mistaken for each other. A test invite counted in the product numbers is
 * a lie about how the loop is doing, and a share link built on a test
 * deployment that points at nyotanow.in sends a guest to a page that is not
 * there.
 *
 * Read from VERCEL_ENV, which Vercel sets on every deployment and which is
 * absent on a laptop. Deliberately server-only: the NEXT_PUBLIC_ copy exists
 * only while the project happens to expose system variables, and a value the
 * server and the browser disagree about would render one banner on the server
 * and a different one in the browser. Everything that reads this runs on the
 * server.
 */
export type Stage = "production" | "preview" | "local";

export function stage(): Stage {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return "production";
    case "preview":
      return "preview";
    // "development" is `vercel dev`, which is a laptop by another name.
    default:
      return "local";
  }
}

export function isProduction(): boolean {
  return stage() === "production";
}

/**
 * The address this deployment actually answers on, or null off Vercel.
 *
 * VERCEL_BRANCH_URL stays the same for the life of a branch, so a link copied
 * out of it still works after the next push. VERCEL_URL changes with every
 * deployment, which makes it only a fallback.
 */
export function deploymentUrl(): string | null {
  const host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : null;
}
