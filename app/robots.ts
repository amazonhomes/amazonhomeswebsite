import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep private/authenticated surfaces and API routes out of the index.
      disallow: ["/admin", "/account", "/api/", "/login", "/register"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
