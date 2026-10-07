import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/invite";
import { OCCASIONS } from "@/lib/occasions";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...OCCASIONS.map((o) => ({
      url: `${base}/create/${o.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Low priority, but listed: a privacy notice nobody can find is not one.
    { url: `${base}/privacy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly" as const, priority: 0.3 },
  ];
}
