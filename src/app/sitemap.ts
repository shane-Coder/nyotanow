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
  ];
}
