'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Check,
  Circle,
  FileText,
  Home,
  Loader2,
  MapPin,
  Ruler,
  X,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import {
  OFFER_STATUS_BADGE,
  OFFER_STATUS_DESCRIPTION,
  OFFER_STATUS_LABELS,
} from '@/lib/offer-status'
import { cn } from '@/lib/utils'
import type { Offer, Property } from '@/lib/types'

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)

const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

function StatusBadge({ status }: { status: Offer['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        OFFER_STATUS_BADGE[status],
      )}
    >
      {OFFER_STATUS_LABELS[status]}
    </span>
  )
}

export default function MyOffersPage() {
  const { ready, currentUser, offers, properties } = useStore()
  const router = useRouter()

  useEffect(() => {
    if (ready && !currentUser) router.replace('/login?redirect=/account/offers')
  }, [ready, currentUser, router])

  const propertyMap = useMemo(() => {
    const m = new Map<string, Property>()
    for (const p of properties) m.set(p.id, p)
    return m
  }, [properties])

  // Defense-in-depth: RLS already returns only the caller's own offers, but we
  // also filter by the authenticated user id here so this page can never render
  // another investor's offer even if extra rows were ever present in state.
  const myOffers = useMemo(() => {
    if (!currentUser) return []
    return offers
      .filter((o) => o.userId === currentUser.id)
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  }, [offers, currentUser])

  if (!ready || !currentUser) {
    return (
      <PageShell>
        <div className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Your account
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground">
            My Offers
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Track the offers you&apos;ve submitted and see their current status.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {myOffers.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {myOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                property={propertyMap.get(offer.propertyId)}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
        No offers yet
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You haven&apos;t submitted any offers yet. Browse available properties and
        submit an offer when you find the right deal.
      </p>
      <Button asChild className="mt-6">
        <Link href="/properties">Browse Properties</Link>
      </Button>
    </div>
  )
}

function OfferCard({
  offer,
  property,
}: {
  offer: Offer
  property?: Property
}) {
  const photo = property?.photos?.find((p) => p.url)?.url ?? ''
  const location = property
    ? [property.neighborhood, property.city, property.state].filter(Boolean).join(', ')
    : ''

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl bg-card p-2 shadow-sm ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/40">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo || '/placeholder.svg'}
            alt={property ? `Photo of ${property.address}` : 'Property photo'}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Home className="size-10" />
          </div>
        )}

        {/* readability gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/5" />

        {/* status badge — strongest offer indicator, top-left */}
        <div className="absolute left-3 top-3 z-10">
          <StatusBadge status={offer.status} />
        </div>

        {/* asking price pill — dark glass, top-right */}
        {property && (
          <div className="absolute right-3 top-3 z-10 rounded-full bg-black/45 px-4 py-2 text-sm font-bold text-white backdrop-blur-md">
            {currency(property.price)}
          </div>
        )}

        {/* property info overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2.5 p-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-balance">
              {property?.address ?? 'Property unavailable'}
            </h3>
            {property?.type && (
              <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold capitalize backdrop-blur-sm">
                {property.type}
              </span>
            )}
          </div>

          {location && (
            <p className="flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="size-4 shrink-0 text-white/70" />
              <span className="truncate">{location}</span>
            </p>
          )}

          {property && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/90">
              {property.beds != null && (
                <span className="flex items-center gap-1.5">
                  <BedDouble className="size-4 text-white/70" /> {property.beds} Beds
                </span>
              )}
              {property.baths != null && (
                <span className="flex items-center gap-1.5">
                  <Bath className="size-4 text-white/70" /> {property.baths} Baths
                </span>
              )}
              {property.sqft != null && (
                <span className="flex items-center gap-1.5">
                  <Ruler className="size-4 text-white/70" /> {property.sqft.toLocaleString()} Sqft
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* offer summary panel */}
      <div className="flex flex-1 flex-col gap-3 px-3 pb-2 pt-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your offer
            </p>
            <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-foreground">
              {currency(offer.amount)}
            </p>
          </div>
          {property && (
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Asking
              </p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                {currency(property.price)}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Submitted {fullDate(offer.createdAt)}
        </p>

        <div className="mt-auto flex flex-col gap-1.5 pt-1">
          <OfferDetailDialog offer={offer} property={property} />
          {property && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Link href={`/properties/${property.id}`}>
                View Property
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

function OfferDetailDialog({
  offer,
  property,
}: {
  offer: Offer
  property?: Property
}) {
  const location = property
    ? [property.neighborhood, property.city, property.state].filter(Boolean).join(', ')
    : ''

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full">View Offer Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Offer Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <p className="font-medium text-foreground">
              {property?.address ?? 'Property'}
            </p>
            {location && (
              <p className="text-sm text-muted-foreground">{location}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Your Offer
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {currency(offer.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Asking Price
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
                {property ? currency(property.price) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Submitted
              </p>
              <p className="mt-0.5 text-sm text-foreground">
                {fullDate(offer.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <div className="mt-1">
                <StatusBadge status={offer.status} />
              </div>
            </div>
          </div>

          {offer.notes && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Your notes / terms
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {offer.notes}
              </p>
            </div>
          )}

          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {OFFER_STATUS_DESCRIPTION[offer.status]}
          </p>

          <Separator />

          <OfferTimeline status={offer.status} />

          {property && (
            <Button asChild className="mt-1 w-full gap-1">
              <Link href={`/properties/${property.id}`}>
                View Property
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Current-state progression only. The offers table stores just the current
 * status with no transition history, so we render where the offer stands today
 * without fabricating timestamps for each step.
 */
function OfferTimeline({ status }: { status: Offer['status'] }) {
  const reviewed =
    status === 'reviewed' || status === 'accepted' || status === 'declined'
  const decided = status === 'accepted' || status === 'declined'

  const steps: {
    label: string
    state: 'done' | 'failed' | 'pending'
  }[] = [
    { label: 'Offer Submitted', state: 'done' },
    { label: 'Under Review', state: reviewed ? 'done' : 'pending' },
    {
      label:
        status === 'accepted'
          ? 'Accepted'
          : status === 'declined'
            ? 'Declined'
            : 'Decision',
      state: decided ? (status === 'accepted' ? 'done' : 'failed') : 'pending',
    },
  ]

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <li key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full',
                  step.state === 'done' &&
                    'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
                  step.state === 'failed' &&
                    'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
                  step.state === 'pending' &&
                    'bg-muted text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {step.state === 'done' ? (
                  <Check className="size-3.5" />
                ) : step.state === 'failed' ? (
                  <X className="size-3.5" />
                ) : (
                  <Circle className="size-2.5" />
                )}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'my-1 w-px flex-1',
                    step.state === 'done' ? 'bg-green-300 dark:bg-green-500/40' : 'bg-border',
                  )}
                />
              )}
            </div>
            <span
              className={cn(
                'pb-4 text-sm',
                step.state === 'pending'
                  ? 'text-muted-foreground'
                  : 'font-medium text-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
