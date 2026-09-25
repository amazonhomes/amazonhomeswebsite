"use client";

import { useEffect, useState } from "react";
import { Flame, Sparkles, HousePlus } from "lucide-react";
import { PropertyCard } from "@/components/property-card";
import { useStore } from "@/lib/store";
import type { Property } from "@/lib/types";

const NEW_LISTING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// A listing is "new" when its publication/creation time is within the last 7 days.
// Safe against missing/invalid timestamps and future-dated values.
export function isNewListing(
  timestamp: string | null | undefined,
  now: number,
): boolean {
  if (!timestamp) return false;
  const published = new Date(timestamp).getTime();
  if (Number.isNaN(published)) return false;
  if (published > now) return false;
  return now - published < NEW_LISTING_WINDOW_MS;
}

// PropertyCard wrapped with the shared "Hot" and "New listing" status badges.
// The Hot badge reflects real submitted-offer counts; the New listing badge uses
// the 7-day window above. Both can show at once, stacked above the card.
export function BadgedPropertyCard({ property }: { property: Property }) {
  const { offerCounts } = useStore();
  // Resolve "now" only after mount so server and client render identically (no hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const count = offerCounts[property.id] ?? 0;
  const isHot = count > 0;
  const isNew = now !== null && isNewListing(property.createdAt, now);

  return (
    <div className="relative">
      {(isHot || isNew) && (
        <div className="absolute -top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-1.5">
          {isNew && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-md">
              <HousePlus className="size-3.5" />
              New Listing
            </span>
          )}
          {isHot && (
            <span className="inline-flex items-center gap-1 rounded-sm bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 shadow-sm">
              <Flame className="size-3.5 fill-red-500 text-orange-500" />
              Hot · {count} {count === 1 ? "offer" : "offers"}
            </span>
          )}
          
        </div>
      )}
      <PropertyCard property={property} />
    </div>
  );
}
