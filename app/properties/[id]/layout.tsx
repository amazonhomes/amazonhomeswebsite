import type { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/site"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  try {
    const supabase = await createClient()
    const { data: property } = await supabase
      .from("properties")
      .select("address, neighborhood, city, state, zip, type, description, status")
      .eq("id", id)
      .maybeSingle()

    if (!property) {
      return { title: "Property not found" }
    }

    const location = [property.neighborhood, property.city, property.state]
      .filter(Boolean)
      .join(", ")
    const title = `${property.address} — ${location}`
    const description =
      property.description?.slice(0, 200) ??
      `Off-market ${property.type ?? "investment"} property in ${location}. Register to unlock protected photos, financials, and showing details.`
    const canonical = `${getSiteUrl()}/properties/${id}`

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        type: "website",
        title,
        description,
        url: canonical,
        siteName: "Amazon Homes",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    }
  } catch {
    return { title: "Property details" }
  }
}

export default function PropertyDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
