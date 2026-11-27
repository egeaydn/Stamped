import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { countries } from "@/lib/visa";
import meta from "@/data/meta.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(meta.generatedAt);
  return [
    { url: SITE_URL, lastModified, priority: 1 },
    { url: `${SITE_URL}/ranking`, lastModified, priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified, priority: 0.3 },
    ...countries.map((c) => ({ url: `${SITE_URL}/p/${c.iso3}`, lastModified, priority: 0.7 })),
  ];
}
