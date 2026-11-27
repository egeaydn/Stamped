import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /covers geliştirme aracıdır, dizinlenmesin
    rules: { userAgent: "*", allow: "/", disallow: "/covers" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
