'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Heart,
  Lock,
  MapPin,
  Ruler,
} from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { Property } from '@/lib/types'

export function PropertyCard({ property }: { property: Property }) {
  const photos =
    property.photos.length > 0
      ? property.photos
      : [{ url: '', alt: property.address, protected: false }]

  const [active, setActive] = useState(0)

  const {
    currentUser,
    savedPropertyIds,
    toggleSaveProperty,
  } = useStore()

  const favorite = savedPropertyIds.includes(property.id)

  const current = photos[Math.min(active, photos.length - 1)]
  const locked = Boolean(current?.protected && !current?.url)

  async function onToggleSave() {
    if (!currentUser) {
      toast('Log in to save this property', {
        action: {
          label: 'Log in',
          onClick: () => (window.location.href = '/login'),
        },
      })
      return
    }

    const result = await toggleSaveProperty(property.id)

    if (!result.ok && result.error) {
      toast.error(result.error)
    }
  }

  return (
    <article
      className="
        group relative overflow-hidden rounded-3xl
        border border-neutral-200
        bg-card p-2 shadow-sm
        transition-all duration-300
        hover:-translate-y-1
        hover:border-primary/40
        hover:shadow-xl
      "
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] bg-muted">

        {/* Property image */}
        <img
          src={current?.url || '/placeholder.svg'}
          alt={
            locked
              ? 'Protected property photo — sign in to view'
              : `${property.address}, ${property.neighborhood}`
          }
          className={cn(
            'size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]',
            locked && 'scale-105 blur-sm brightness-95',
          )}
        />

        {/* Readability gradient */}
        <div
          className="
            pointer-events-none absolute inset-0
            bg-gradient-to-t
            from-black/90
            via-black/20
            to-black/5
          "
        />

        {/* Locked photo */}
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="
                flex size-10 items-center justify-center
                rounded-full bg-white/80
                text-neutral-900 shadow-sm
                backdrop-blur-md
              "
            >
              <Lock className="size-4" />
            </span>
          </div>
        )}

        {/* Price */}
        <div
          className="
            absolute left-3 top-3 z-10
            rounded-full
            bg-black/65
            px-4 py-2
            text-sm font-bold text-white
            shadow-sm backdrop-blur-md
          "
        >
          {formatCurrency(property.price)}
        </div>

        {/* Favorite */}
        <button
          type="button"
          aria-label={
            favorite
              ? 'Remove from saved properties'
              : 'Save this property'
          }
          aria-pressed={favorite}
          onClick={onToggleSave}
          className="
            absolute right-3 top-3 z-10
            flex size-10 items-center justify-center
            rounded-full
            bg-black/50 text-white
            shadow-sm backdrop-blur-md
            transition-all duration-200
            hover:scale-105 hover:bg-black/70
          "
        >
          <Heart
            className={cn(
              'size-5 transition-all duration-200',
              favorite && 'fill-red-500 text-red-500',
            )}
          />
        </button>

        {/* Property information */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3 p-4 text-white">

          {/* Address + Property Type */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-balance font-display text-lg font-bold leading-tight tracking-tight">
              {property.address}
            </h3>

            <span
              className="
                shrink-0 rounded-full
                bg-white/90
                px-2.5 py-1
                text-[11px] font-semibold capitalize
                text-neutral-800
                shadow-sm backdrop-blur-md
              "
            >
              {property.type}
            </span>
          </div>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <MapPin className="size-4 shrink-0 text-white/70" />

            <span className="truncate">
              {property.neighborhood}, {property.city}, {property.state}
            </span>
          </p>

          {/* Property Specs */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">

            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4 text-white/70" />
              <span className="font-medium">{property.beds}</span>
              Beds
            </span>

            <span className="flex items-center gap-1.5">
              <Bath className="size-4 text-white/70" />
              <span className="font-medium">{property.baths}</span>
              Baths
            </span>

            <span className="flex items-center gap-1.5">
              <Ruler className="size-4 text-white/70" />
              <span className="font-medium">
                {property.sqft.toLocaleString()}
              </span>
              Sqft
            </span>

          </div>

          {/* View Details */}
          <Link
            href={`/properties/${property.id}`}
            className="
              group/button mt-1
              flex items-center justify-center gap-2
              rounded-full
              bg-white
              px-4 py-3
              text-sm font-semibold
              text-neutral-900
              shadow-sm
              transition-all duration-200
              hover:bg-neutral-100
            "
          >
            View Details

            <ArrowUpRight
              className="
                size-4
                transition-transform duration-200
                group-hover/button:translate-x-0.5
                group-hover/button:-translate-y-0.5
              "
            />
          </Link>

        </div>
      </div>
    </article>
  )
}