'use client'

import Link from 'next/link'
import { notFound, useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Bookmark,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Lock,
  MapPin,
  Ruler,
  TrendingUp,
} from 'lucide-react'

import { PageShell } from '@/components/page-shell'
import { OfferForm } from '@/components/forms/offer-form'
import { ShowingForm } from '@/components/forms/showing-form'
import { LockedImage } from '@/components/locked-image'
import { OfferCountdown } from '@/components/offer-countdown'
import { StatusBadge } from '@/components/status-badge'
import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Link2, MapPinnedIcon } from 'lucide-react'
import { withUtm } from '@/lib/utm'
import { useCountdown } from '@/lib/use-countdown'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate } from '@/lib/format'
import { rehabLevelLabel } from '@/lib/rehab'
import { useStore } from '@/lib/store'
import type { Property } from '@/lib/types'

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>()

  const {
    properties,
    currentUser,
    incrementViews,
    offerCounts,
    ready,
    savedPropertyIds,
    toggleSaveProperty,
  } = useStore()

  const property = properties.find((p) => p.id === params.id)

  const isAuthed = Boolean(currentUser)

  const offerCount = property ? offerCounts[property.id] ?? 0 : 0

  const [activePhoto, setActivePhoto] = useState(0)

  const [thumbnailStart, setThumbnailStart] = useState(0)

  const countdown = useCountdown(property?.offerDeadline ?? null)

  const offersClosed = Boolean(countdown?.expired)

  const saved = property
    ? savedPropertyIds.includes(property.id)
    : false

  async function onToggleSave() {
    if (!property) return

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

  useEffect(() => {
    if (property) {
      incrementViews(property.id)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  // Rehab is now a category (Light/Medium/Large),
  // so it no longer enters the math.
  const spread = useMemo(
    () => (property ? property.arv - property.price : 0),
    [property],
  )

  if (ready && !property) {
    notFound()
  }

  if (!property) {
    return null
  }

  const canTransact =
    property.status === 'available' ||
    property.status === 'under-contract'

  /*
   * Gallery / carousel
   */
  const thumbnailCount = 4

  const photoCount = property.photos.length

  const maxThumbnailStart = Math.max(
    0,
    photoCount - thumbnailCount,
  )

  const cover =
    property.photos[activePhoto] ??
    property.photos[0]

  const visiblePhotos = property.photos.slice(
    thumbnailStart,
    thumbnailStart + thumbnailCount,
  )

  function selectPhoto(index: number) {
    if (index < 0 || index >= photoCount) {
      return
    }

    setActivePhoto(index)

    setThumbnailStart((current) => {
      if (index < current) {
        return index
      }

      if (index >= current + thumbnailCount) {
        return Math.min(
          index - thumbnailCount + 1,
          maxThumbnailStart,
        )
      }

      return current
    })
  }

  function shiftThumbnailWindow(direction: -1 | 1) {
    const nextStart = Math.min(
      maxThumbnailStart,
      Math.max(
        0,
        thumbnailStart + direction,
      ),
    )

    setThumbnailStart(nextStart)

    /*
     * Keep the currently active photo inside
     * the visible 4-thumbnail window.
     */
    if (activePhoto < nextStart) {
      setActivePhoto(nextStart)
    } else if (
      activePhoto >= nextStart + thumbnailCount
    ) {
      setActivePhoto(
        Math.min(
          photoCount - 1,
          nextStart + thumbnailCount - 1,
        ),
      )
    }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="mb-4 -ml-2"
        >
          <Link href="/properties">
            <ArrowLeft className="size-4" />
            Back to properties
          </Link>
        </Button>

        {/*
          Mobile order:
          gallery → deal panel → details

          Desktop:
          gallery + details on left,
          sticky deal panel on right.
        */}

        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1">
            <div className="flex flex-col gap-3">

              {/* MAIN IMAGE */}
              <div className="relative overflow-hidden rounded-lg">
                <LockedImage
                  src={cover.url}
                  alt={cover.alt}
                  locked={
                    cover.protected &&
                    !isAuthed
                  }
                  previewUrl={cover.previewUrl}
                  propertyId={property.id}
                  className="aspect-[16/10] w-full rounded-lg"
                />

                {/* MAIN IMAGE ARROWS */}
                {photoCount > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        selectPhoto(
                          activePhoto - 1,
                        )
                      }
                      disabled={
                        activePhoto === 0
                      }
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/85 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
                    >
                      <ChevronLeft className="size-5" />
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      onClick={() =>
                        selectPhoto(
                          activePhoto + 1,
                        )
                      }
                      disabled={
                        activePhoto ===
                        photoCount - 1
                      }
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-background/85 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
                    >
                      <ChevronRight className="size-5" />
                    </Button>
                  </>
                )}

                {/* PHOTO COUNTER */}
                {photoCount > 0 && (
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {activePhoto + 1} /{' '}
                    {photoCount}
                  </div>
                )}
              </div>

              {/* THUMBNAIL CAROUSEL */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* PREVIOUS THUMBNAILS */}
                {photoCount >
                  thumbnailCount && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      shiftThumbnailWindow(-1)
                    }
                    disabled={
                      thumbnailStart === 0
                    }
                    aria-label="Previous thumbnails"
                    className="size-9 shrink-0 rounded-full sm:size-10"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                )}

                {/* EXACTLY 4 THUMBNAIL COLUMNS */}
                <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 sm:gap-3">
                  {visiblePhotos.map(
                    (
                      photo,
                      visibleIndex,
                    ) => {
                      const photoIndex =
                        thumbnailStart +
                        visibleIndex

                      return (
                        <button
                          key={
                            photo.url +
                            photoIndex
                          }
                          type="button"
                          onClick={() =>
                            selectPhoto(
                              photoIndex,
                            )
                          }
                          className={cn(
                            'relative min-w-0 overflow-hidden rounded-md ring-2 transition',
                            photoIndex ===
                              activePhoto
                              ? 'ring-accent'
                              : 'ring-transparent',
                          )}
                          aria-label={`View photo ${
                            photoIndex + 1
                          }`}
                          aria-current={
                            photoIndex ===
                            activePhoto
                              ? 'true'
                              : undefined
                          }
                        >
                          <LockedImage
                            src={photo.url}
                            alt={photo.alt}
                            locked={
                              photo.protected &&
                              !isAuthed
                            }
                            previewUrl={
                              photo.previewUrl
                            }
                            propertyId={
                              property.id
                            }
                            className="aspect-square w-full"
                            compact
                          />
                        </button>
                      )
                    },
                  )}
                </div>

                {/* NEXT THUMBNAILS */}
                {photoCount >
                  thumbnailCount && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      shiftThumbnailWindow(1)
                    }
                    disabled={
                      thumbnailStart ===
                      maxThumbnailStart
                    }
                    aria-label="Next thumbnails"
                    className="size-9 shrink-0 rounded-full sm:size-10"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>

              {/* LOCKED PHOTOS MESSAGE */}
              {!isAuthed && (
                <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary px-4 py-3">
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Lock className="size-4 text-primary" />

                    {
                      property.photos.filter(
                        (p) => p.protected,
                      ).length
                    }{' '}
                    interior photos are locked.
                  </p>

                  <Button
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/register?redirect=/properties/${property.id}`}
                    >
                      Unlock
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* DEAL PANEL */}
          <aside className="lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:h-fit lg:self-start">
            <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-6">
              <PropertyHeading
                property={property}
              />

              {/* FINANCIALS */}
              {isAuthed ? (
                <dl className="flex flex-col gap-2.5 rounded-md bg-secondary p-4 text-sm">
                  <Row
                    label="After-repair value (ARV)"
                    value={formatCurrency(
                      property.arv,
                    )}
                  />

                  <Row
                    label="Estimated rehab"
                    value={rehabLevelLabel(
                      property.rehabLevel,
                    )}
                  />

                  <div className="my-1 h-px bg-border" />

                  <Row
                    label="Estimated spread (ARV − price)"
                    value={formatCurrency(
                      spread,
                    )}
                    emphasize
                  />
                </dl>
              ) : (
                <div className="relative overflow-hidden rounded-md bg-secondary p-4">
                  <div
                    className="flex flex-col gap-2.5 text-sm blur-sm select-none"
                    aria-hidden="true"
                  >
                    <Row
                      label="After-repair value (ARV)"
                      value="$000,000"
                    />

                    <Row
                      label="Estimated rehab"
                      value="Medium"
                    />

                    <Row
                      label="Estimated spread"
                      value="$00,000"
                      emphasize
                    />
                  </div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/40 text-center">
                    <Lock className="size-5 text-accent" />

                    <p className="text-xs font-medium text-foreground">
                      Financials locked
                    </p>

                    <Button
                      size="sm"
                      asChild
                    >
                      <Link
                        href={`/register?redirect=/properties/${property.id}`}
                      >
                        Register to view
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* OFFER DEADLINE */}
              {canTransact &&
                property.offerDeadline && (
                  <OfferCountdown
                    deadline={
                      property.offerDeadline
                    }
                  />
                )}

              {/* TRANSACTION ACTIONS */}
              {canTransact ? (
                offersClosed ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
                      Offer submission for
                      this property has
                      closed.
                    </p>

                    {isAuthed && (
                      <ShowingDialog
                        property={property}
                      />
                    )}
                  </div>
                ) : isAuthed ? (
                  <div className="flex flex-col gap-2.5">
                    <Dialog>
                      <DialogTrigger
                        asChild
                      >
                        <Button size="lg">
                          Submit an offer
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>
                            Submit an offer
                          </DialogTitle>

                          <DialogDescription>
                            {
                              property.address
                            }{' '}
                            · Asking{' '}
                            {formatCurrency(
                              property.price,
                            )}
                          </DialogDescription>
                        </DialogHeader>

                        <OfferForm
                          property={property}
                        />
                      </DialogContent>
                    </Dialog>

                    <ShowingDialog
                      property={property}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button
                      size="lg"
                      asChild
                    >
                      <Link
                        href={`/register?redirect=/properties/${property.id}`}
                      >
                        Register to make an
                        offer
                      </Link>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                    >
                      <Link
                        href={`/login?redirect=/properties/${property.id}`}
                      >
                        Log in
                      </Link>
                    </Button>
                  </div>
                )
              ) : (
                <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
                  This property is{' '}
                  {property.status}.
                </p>
              )}

              {/* SAVE PROPERTY */}
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={onToggleSave}
                aria-pressed={saved}
                className="justify-center gap-2"
              >
                <Bookmark
                  className={cn(
                    'size-4',
                    saved &&
                      'fill-current',
                  )}
                />

                {saved
                  ? 'Saved'
                  : 'Save property'}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Sold as-is. Figures are
                estimates, not guarantees.
              </p>
            </div>
          </aside>

          {/* LEFT-SIDE PROPERTY DETAILS */}
          <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-2">

            {/* ABOUT */}
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                About this property
              </h2>

              <p className="mt-2 leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            </div>

            {/* LOCATION */}
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Location
              </h2>

              {isAuthed ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-border">
                  <iframe
                    title={`Map of ${property.address}`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
                    )}&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="aspect-[16/9] w-full"
                  />

                  <a
                    href={withUtm(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${property.address}, ${property.city}, ${property.state} ${property.zip}`,
                      )}`,
                      {
                        utm_campaign:
                          'property_map',
                      },
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-t border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <MapPin className="size-4 text-primary" />

                    Open in Google Maps
                  </a>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-dashed border-border p-4">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-4" />

                    The exact location and
                    map unlock after you
                    register.
                  </p>

                  <Button
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/register?redirect=/properties/${property.id}`}
                    >
                      Unlock
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* HIGHLIGHTS */}
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Highlights
              </h2>

              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {property.highlights.map(
                  (h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <TrendingUp className="mt-0.5 size-4 shrink-0 text-accent" />

                      {h}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* SHOWING INFORMATION */}
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Showing information
              </h2>

              {isAuthed ? (
                <p className="mt-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                  {property.showingInfo}
                </p>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-4 rounded-md border border-dashed border-border p-4">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-4" />

                    Showing details are
                    visible to registered
                    investors.
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <Link
                      href={`/login?redirect=/properties/${property.id}`}
                    >
                      Log in
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/**
 * Top of the deal panel,
 * rendered once for every breakpoint:
 *
 * status row → address → asking price →
 * location → listed date → key facts
 */
function PropertyHeading({
  property,
}: {
  property: Property
}) {
  const fullAddress =
    `${property.address}, ${property.city}, ${property.state} ${property.zip}`

  return (
    <div className="flex flex-col">
      {/* STATUS / TYPE / VIEWS */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={property.status} />

        <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
          {property.type}
        </span>

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          {property.views} views
        </span>

        {/* DESKTOP COPY ICONS */}
        <div className="ml-auto hidden items-center gap-1 sm:flex">
          <CopyButton
            iconOnly
            variant="ghost"
            value={fullAddress}
            label="Copy address"
            copiedLabel="Address copied"
            icon={<MapPinnedIcon className="size-4" />}
            toastMessage="Address copied to clipboard"
            className="text-muted-foreground hover:text-foreground"
          />

          <CopyButton
            iconOnly
            variant="ghost"
            getValue={() =>
              typeof window !== 'undefined'
                ? window.location.href
                : ''
            }
            label="Copy link"
            copiedLabel="Link copied"
            icon={<Link2 className="size-4" />}
            toastMessage="Share link copied to clipboard"
            className="text-muted-foreground hover:text-foreground"
          />
        </div>
      </div>

      {/* ADDRESS */}
      <h1 className="mt-3 break-words text-balance font-display text-[2rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2.25rem] lg:text-[2rem]">
  {property.address}
</h1>

      {/* ASKING PRICE */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Asking price
          </p>

          <p className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {formatCurrency(property.price)}
          </p>
        </div>

        {/* MOBILE COPY ICONS */}
<div className="flex shrink-0 items-center gap-0.5 sm:hidden">
  <CopyButton
    iconOnly
    variant="ghost"
    value={fullAddress}
    label="Copy address"
    copiedLabel="Address copied"
    icon={<MapPinnedIcon className="size-3.5" />}
    toastMessage="Address copied to clipboard"
    className="size-7 p-0 text-muted-foreground hover:text-foreground"
  />

  <CopyButton
    iconOnly
    variant="ghost"
    getValue={() =>
      typeof window !== 'undefined'
        ? window.location.href
        : ''
    }
    label="Copy link"
    copiedLabel="Link copied"
    icon={<Link2 className="size-3.5" />}
    toastMessage="Share link copied to clipboard"
    className="size-7 p-0 text-muted-foreground hover:text-foreground"
  />
</div>
      </div>

      {/* LOCATION */}
      <p className="mt-4 flex items-start gap-1.5 text-sm text-muted-foreground">
        <MapPin className="mt-0.5 size-4 shrink-0" />

        {property.neighborhood}, {property.city},{' '}
        {property.state} {property.zip}
      </p>

      {/* LISTED DATE */}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" />

        Listed {formatDate(property.createdAt)}
      </p>

      {/* PROPERTY FACTS */}
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border text-center min-[380px]:grid-cols-4">
        <Fact
          icon={BedDouble}
          label="Beds"
          value={String(property.beds)}
        />

        <Fact
          icon={Bath}
          label="Baths"
          value={String(property.baths)}
        />

        <Fact
          icon={Ruler}
          label="Sqft"
          value={property.sqft.toLocaleString()}
        />

        <Fact
          icon={CalendarClock}
          label="Built"
          value={
            property.yearBuilt
              ? String(property.yearBuilt)
              : '—'
          }
        />
      </dl>
    </div>
  )
}

function ShowingDialog({
  property,
}: {
  property: Property
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant="outline"
        >
          Request a showing
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Request a showing
          </DialogTitle>

          <DialogDescription>
            Schedule a walkthrough of{' '}
            {property.address}.
          </DialogDescription>
        </DialogHeader>

        <ShowingForm
          property={property}
        />
      </DialogContent>
    </Dialog>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 bg-card px-1 py-2.5">
      <Icon
        className="size-4 text-primary"
        aria-hidden="true"
      />

      <dd className="font-display text-sm font-bold text-foreground">
        {value}
      </dd>

      <dt className="text-xs text-muted-foreground">
        {label}
      </dt>
    </div>
  )
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">
        {label}
      </dt>

      <dd
        className={
          emphasize
            ? 'font-display text-base font-bold text-foreground'
            : 'font-medium text-foreground'
        }
      >
        {value}
      </dd>
    </div>
  )
}