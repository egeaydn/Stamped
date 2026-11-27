import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // OG görseli bayrak SVG'lerini çalışma anında diskten okur; sunucu paketine dahil et
  outputFileTracingIncludes: {
    "/p/*/opengraph-image": ["./node_modules/flag-icons/flags/4x3/*.svg"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
