import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site"

// Revalidate the sitemap hourly so newly listed properties get picked up.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/properties`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
  ]

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("properties")
      .select("id, created_at")
      .order("created_at", { ascending: false })

    const propertyRoutes: MetadataRoute.Sitemap = (data ?? []).map((p) => ({
      url: `${base}/properties/${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: "daily",
      priority: 0.8,
    }))

    return [...staticRoutes, ...propertyRoutes]
  } catch {
    // If the database is unreachable at build/request time, still emit the
    // static routes rather than failing the whole sitemap.
    return staticRoutes
  }
}
