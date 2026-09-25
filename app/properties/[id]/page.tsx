"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Bookmark,
  CalendarClock,
  Eye,
  Flame,
  Lock,
  MapPin,
  Ruler,
  TrendingUp,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { OfferForm } from "@/components/forms/offer-form";
import { ShowingForm } from "@/components/forms/showing-form";
import { LockedImage } from "@/components/locked-image";
import { OfferCountdown } from "@/components/offer-countdown";
import { StatusBadge } from "@/components/status-badge";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Link2, MapPinnedIcon } from "lucide-react";
import { withUtm } from "@/lib/utm";
import { useCountdown } from "@/lib/use-countdown";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { daysUntil, formatCurrency, formatDate } from "@/lib/format";
import { useStore } from "@/lib/store";

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    properties,
    currentUser,
    incrementViews,
    offerCounts,
    ready,
    savedPropertyIds,
    toggleSaveProperty,
  } = useStore();
  const property = properties.find((p) => p.id === params.id);
  const isAuthed = Boolean(currentUser);
  const offerCount = property ? (offerCounts[property.id] ?? 0) : 0;
  const [activePhoto, setActivePhoto] = useState(0);
  const countdown = useCountdown(property?.offerDeadline ?? null);
  const offersClosed = Boolean(countdown?.expired);
  const saved = property ? savedPropertyIds.includes(property.id) : false;

  async function onToggleSave() {
    if (!property) return;
    if (!currentUser) {
      toast("Log in to save this property", {
        action: {
          label: "Log in",
          onClick: () => (window.location.href = "/login"),
        },
      });
      return;
    }
    const result = await toggleSaveProperty(property.id);
    if (!result.ok && result.error) toast.error(result.error);
  }

  useEffect(() => {
    if (property) incrementViews(property.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const spread = useMemo(
    () =>
      property ? property.arv - property.price - property.estimatedRehab : 0,
    [property],
  );

  if (ready && !property) notFound();
  if (!property) return null;

  const deadline = daysUntil(property.offerDeadline);
  const canTransact =
    property.status === "available" || property.status === "under-contract";
  const cover = property.photos[activePhoto] ?? property.photos[0];

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href="/properties">
              <ArrowLeft className="size-4" />
              Back to properties
            </Link>
          </Button>

          {offerCount > 0 && (
            <p className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
              <Flame className="size-3.5 shrink-0 fill-red-500 text-orange-500" />
              <span>
                {offerCount === 1
                  ? "1 offer submitted on this property"
                  : `${offerCount} offers submitted on this property`}
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Left: gallery + details */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <LockedImage
                src={cover.url}
                alt={cover.alt}
                locked={cover.protected && !isAuthed}
                className="aspect-[16/10] w-full rounded-lg"
              />
              <div className="grid grid-cols-4 gap-3">
                {property.photos.map((photo, i) => (
                  <button
                    key={photo.url + i}
                    onClick={() => setActivePhoto(i)}
                    className={`relative overflow-hidden rounded-md ring-2 transition ${
                      i === activePhoto ? "ring-accent" : "ring-transparent"
                    }`}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <LockedImage
                      src={photo.url}
                      alt={photo.alt}
                      locked={photo.protected && !isAuthed}
                      className="aspect-square w-full"
                      compact
                    />
                  </button>
                ))}
              </div>
              {!isAuthed && (
                <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-secondary px-4 py-3">
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Lock className="size-4 text-primary" />
                    {property.photos.filter((p) => p.protected).length} interior
                    photos are locked.
                  </p>
                  <Button size="sm" asChild>
                    <Link
                      href={`/register?redirect=/properties/${property.id}`}
                    >
                      Unlock
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={property.status} />
                <span className="rounded-sm bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                  {property.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="size-3.5" /> {property.views} views
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
                {property.address}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" />
                {property.neighborhood}, {property.city}, {property.state}{" "}
                {property.zip}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5" />
                Listed {formatDate(property.createdAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <CopyButton
                  value={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
                  label="Copy address"
                  copiedLabel="Address copied"
                  icon={<MapPinnedIcon className="size-4" />}
                  toastMessage="Address copied to clipboard"
                />
                <CopyButton
                  getValue={() =>
                    typeof window !== "undefined" ? window.location.href : ""
                  }
                  label="Copy link"
                  copiedLabel="Link copied"
                  icon={<Link2 className="size-4" />}
                  toastMessage="Share link copied to clipboard"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                icon={BedDouble}
                label="Beds"
                value={String(property.beds)}
              />
              <Stat icon={Bath} label="Baths" value={String(property.baths)} />
              <Stat
                icon={Ruler}
                label="Sqft"
                value={property.sqft.toLocaleString()}
              />
              <Stat
                icon={CalendarClock}
                label="Built"
                value={String(property.yearBuilt)}
              />
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                About this property
              </h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {property.description}
              </p>
            </div>

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
                      { utm_campaign: "property_map" },
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 border-t border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <MapPin className="size-4 text-accent" />
                    Open in Google Maps
                  </a>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-dashed border-border p-4">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="size-4" /> The exact location and map
                    unlock after you register.
                  </p>
                  <Button size="sm" asChild>
                    <Link
                      href={`/register?redirect=/properties/${property.id}`}
                    >
                      Unlock
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Highlights
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {property.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  >
                    <TrendingUp className="mt-0.5 size-4 shrink-0 text-accent" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

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
                    <Lock className="size-4" /> Showing details are visible to
                    registered investors.
                  </p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/login?redirect=/properties/${property.id}`}>
                      Log in
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: sticky deal panel */}
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-6">
              <div>
                <p className="text-sm text-muted-foreground">Asking price</p>
                <p className="font-display text-4xl font-bold tracking-tight text-foreground">
                  {formatCurrency(property.price)}
                </p>
              </div>

              {isAuthed ? (
                <dl className="flex flex-col gap-2.5 rounded-md bg-secondary p-4 text-sm">
                  <Row
                    label="After-repair value (ARV)"
                    value={formatCurrency(property.arv)}
                  />
                  <Row
                    label="Estimated rehab"
                    value={formatCurrency(property.estimatedRehab)}
                  />
                  <div className="my-1 h-px bg-border" />
                  <Row
                    label="Estimated spread"
                    value={formatCurrency(spread)}
                    emphasize
                  />
                </dl>
              ) : (
                <div className="relative overflow-hidden rounded-md bg-secondary p-4">
                  <div
                    className="flex flex-col gap-2.5 text-sm blur-sm select-none"
                    aria-hidden="true"
                  >
                    <Row label="After-repair value (ARV)" value="$000,000" />
                    <Row label="Estimated rehab" value="$00,000" />
                    <Row label="Estimated spread" value="$00,000" emphasize />
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/40 text-center">
                    <Lock className="size-5 text-accent" />
                    <p className="text-xs font-medium text-foreground">
                      Financials locked
                    </p>
                    <Button size="sm" asChild>
                      <Link
                        href={`/register?redirect=/properties/${property.id}`}
                      >
                        Register to view
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {canTransact && property.offerDeadline && (
                <OfferCountdown deadline={property.offerDeadline} />
              )}

              {canTransact ? (
                offersClosed ? (
                  <div className="flex flex-col gap-2.5">
                    <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
                      Offer submission for this property has closed.
                    </p>
                    {isAuthed && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="lg" variant="outline">
                            Request a showing
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Request a showing</DialogTitle>
                            <DialogDescription>
                              Schedule a walkthrough of {property.address}.
                            </DialogDescription>
                          </DialogHeader>
                          <ShowingForm property={property} />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                ) : isAuthed ? (
                  <div className="flex flex-col gap-2.5">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="lg">Submit an offer</Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Submit an offer</DialogTitle>
                          <DialogDescription>
                            {property.address} · Asking{" "}
                            {formatCurrency(property.price)}
                          </DialogDescription>
                        </DialogHeader>
                        <OfferForm property={property} />
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="lg" variant="outline">
                          Request a showing
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Request a showing</DialogTitle>
                          <DialogDescription>
                            Schedule a walkthrough of {property.address}.
                          </DialogDescription>
                        </DialogHeader>
                        <ShowingForm property={property} />
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    <Button size="lg" asChild>
                      <Link
                        href={`/register?redirect=/properties/${property.id}`}
                      >
                        Register to make an offer
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link href={`/login?redirect=/properties/${property.id}`}>
                        Log in
                      </Link>
                    </Button>
                  </div>
                )
              ) : (
                <p className="rounded-md bg-secondary px-3 py-2 text-center text-sm text-muted-foreground">
                  This property is {property.status}.
                </p>
              )}

              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={onToggleSave}
                aria-pressed={saved}
                className="justify-center gap-2"
              >
                <Bookmark className={cn("size-4", saved && "fill-current")} />
                {saved ? "Saved" : "Save property"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Sold as-is. Figures are estimates, not guarantees.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BedDouble;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
      <Icon className="size-4 text-primary" />
      <span className="font-display text-lg font-bold text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasize
            ? "font-display text-base font-bold text-foreground"
            : "font-medium text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
