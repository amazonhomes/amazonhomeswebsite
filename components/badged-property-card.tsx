'use client'

import { useEffect, useState } from 'react'
import { BadgeDollarSign, CircleCheck, Clock3, HousePlus } from 'lucide-react'
import { PropertyCard } from '@/components/property-card'
import { STATUS_BADGE_CLASSES } from '@/components/status-badge'
import type { Property } from '@/lib/types'

const NEW_LISTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

// A listing is "new" when its publication/creation time is within the last 7 days.
// Safe against missing/invalid timestamps and future-dated values.
export function isNewListing(timestamp: string | null | undefined, now: number): boolean {
  if (!timestamp) return false
  const published = new Date(timestamp).getTime()
  if (Number.isNaN(published)) return false
  if (published > now) return false
  return now - published < NEW_LISTING_WINDOW_MS
}

type StatusBadge = {
  label: 'New Listing' | 'Active' | 'Pending' | 'Sold'
  className: string
  icon: typeof HousePlus
}

function getStatusBadge(property: Property, now: number | null): StatusBadge {
  if (property.status === 'sold') {
    return { label: 'Sold', className: STATUS_BADGE_CLASSES.sold, icon: BadgeDollarSign }
  }

  if (property.status === 'under-contract') {
    return { label: 'Pending', className: STATUS_BADGE_CLASSES.pending, icon: Clock3 }
  }

  const isNew = now !== null && property.status === 'available' && isNewListing(property.createdAt, now)
  return isNew
    ? { label: 'New Listing', className: STATUS_BADGE_CLASSES.newListing, icon: HousePlus }
    : { label: 'Active', className: STATUS_BADGE_CLASSES.active, icon: CircleCheck }
}

export function BadgedPropertyCard({ property }: { property: Property }) {
  // Resolve "now" after mount to avoid hydration mismatch, then refresh so the
  // badge changes automatically when a listing crosses the seven-day boundary.
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()
    const interval = window.setInterval(updateNow, 60 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  const badge = getStatusBadge(property, now)
  const Icon = badge.icon

  return (
    <div className="relative">
      <div className="absolute -top-3 left-3 right-3 z-20 flex items-center">
        <span className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-semibold shadow-sm ${badge.className}`}>
          <Icon className="size-3.5 shrink-0" aria-hidden="true" />
          {badge.label}
        </span>
      </div>
      <PropertyCard property={property} />
    </div>
  )
}
