'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bookmark, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { PropertyCard } from '@/components/property-card'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'

export default function SavedPropertiesPage() {
  const { ready, currentUser, properties, savedPropertyIds } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (ready && !currentUser) router.replace('/login?redirect=/saved')
  }, [ready, currentUser, router])

  const savedProperties = useMemo(() => {
    const ids = new Set(savedPropertyIds)
    return properties.filter((p) => ids.has(p.id))
  }, [properties, savedPropertyIds])

  if (!ready || !currentUser) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Bookmark className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Saved properties
            </h1>
            <p className="text-sm text-muted-foreground">
              {savedProperties.length === 0
                ? 'You have not saved any properties yet.'
                : `${savedProperties.length} ${savedProperties.length === 1 ? 'property' : 'properties'} saved`}
            </p>
          </div>
        </div>

        {savedProperties.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bookmark className="size-6" />
            </span>
            <div>
              <p className="font-medium text-foreground">Nothing saved yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap the bookmark on any listing to keep track of deals you like.
              </p>
            </div>
            <Button asChild>
              <Link href="/properties">Browse properties</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {savedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
