import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/invite";

export default function robots(): MetadataRoute.Robots {
  return {
    // Invites are personal pages; only the marketing and create pages are public.
    rules: { userAgent: "*", allow: "/", disallow: "/i/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
