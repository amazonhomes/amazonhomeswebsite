'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowUpRight, Bath, BedDouble, Heart, Lock, MapPin, Ruler } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Property } from '@/lib/types'

export function PropertyCard({ property }: { property: Property }) {
  const photos = property.photos.length > 0 ? property.photos : [{ url: '', alt: property.address, protected: false }]
  const [active, setActive] = useState(0)
  const { currentUser, savedPropertyIds, toggleSaveProperty } = useStore()
  const favorite = savedPropertyIds.includes(property.id)

  const current = photos[Math.min(active, photos.length - 1)]
  const locked = Boolean(current?.protected && !current?.url)

  async function onToggleSave() {
    if (!currentUser) {
      toast('Log in to save this property', {
        action: { label: 'Log in', onClick: () => (window.location.href = '/login') },
      })
      return
    }
    const result = await toggleSaveProperty(property.id)
    if (!result.ok && result.error) toast.error(result.error)
  }

  return (
    <article className="group relative overflow-hidden rounded-3xl bg-card p-2 shadow-sm ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] bg-muted">
        <img
          src={current?.url || '/placeholder.svg'}
          alt={locked ? 'Protected property photo — sign in to view' : `${property.address}, ${property.neighborhood}`}
          className={cn(
            'size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]',
            locked && 'scale-105 blur-sm brightness-95',
          )}
        />

        {/* readability gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />

        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/75 text-neutral-900 shadow-sm backdrop-blur-sm">
              <Lock className="size-4" />
            </span>
          </div>
        )}

        {/* price pill */}
        <div className="absolute left-3 top-3 z-10 rounded-full bg-black/45 px-4 py-2 text-sm font-bold text-white backdrop-blur-md">
          {formatCurrency(property.price)}
        </div>

        {/* favorite */}
        <button
          type="button"
          aria-label={favorite ? 'Remove from saved properties' : 'Save this property'}
          aria-pressed={favorite}
          onClick={onToggleSave}
          className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
        >
          <Heart className={cn('size-5 transition-all', favorite && 'fill-red-500 text-red-500')} />
        </button>

        {/* carousel dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-[8.5rem] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`View photo ${i + 1}`}
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  'h-1.5 rounded-full bg-white/50 transition-all',
                  i === active ? 'w-4 bg-white' : 'w-1.5 hover:bg-white/80',
                )}
              />
            ))}
          </div>
        )}

        {/* overlay content */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-balance">
              {property.address}
            </h3>
            <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold capitalize backdrop-blur-sm">
              {property.type}
            </span>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="size-4 shrink-0 text-white/70" />
            <span className="truncate">
              {property.neighborhood}, {property.city}, {property.state}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4 text-white/70" /> {property.beds} Beds
            </span>
            <span className="flex items-center gap-1.5">
              <Bath className="size-4 text-white/70" /> {property.baths} Baths
            </span>
            <span className="flex items-center gap-1.5">
              <Ruler className="size-4 text-white/70" /> {property.sqft.toLocaleString()} Sqft
            </span>
          </div>

          <Link
            href={`/properties/${property.id}`}
            className="mt-1 flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-white/90"
          >
            View Details
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}
