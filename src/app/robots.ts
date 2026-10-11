import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/invite";
import { isProduction } from "@/lib/stage";

export default function robots(): MetadataRoute.Robots {
  // A test deployment must not be indexed at all. Two copies of the same
  // landing page in Google compete with each other, and the one that wins
  // might be the one with half-finished work on it.
  if (!isProduction()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    // Invites are personal pages; only the marketing and create pages are public.
    rules: { userAgent: "*", allow: "/", disallow: ["/i/", "/stats"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
