'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isPrivateStoragePath } from '@/lib/property-images'

async function fetchSignedUrl(url: string): Promise<string | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  return data?.url ?? null
}

export function LockedImage({
  src,
  alt,
  locked,
  previewUrl,
  propertyId,
  className,
  compact = false,
}: {
  src: string
  alt: string
  locked: boolean
  /** Safe low-res/blurred stand-in shown when `locked`. The full-resolution
   *  `src` is never rendered while locked, so the original stays private. */
  previewUrl?: string | null
  /** Required to resolve a protected original stored as a private Storage path
   *  into a short-lived signed URL (authenticated viewers only). */
  propertyId?: string
  className?: string
  compact?: boolean
}) {
  // A protected original may be stored as a private Storage object PATH rather
  // than a directly usable URL. For an unlocked (authenticated) viewer we swap
  // that path for a short-lived signed URL fetched from our server route.
  const needsSignedUrl = !locked && isPrivateStoragePath(src) && Boolean(propertyId)
  const { data: signedUrl } = useSWR(
    needsSignedUrl
      ? `/api/property-images/signed-url?propertyId=${encodeURIComponent(
          propertyId as string,
        )}&path=${encodeURIComponent(src)}`
      : null,
    fetchSignedUrl,
    { revalidateOnFocus: false, refreshInterval: 8 * 60 * 1000 },
  )

  // When locked, render ONLY the safe preview (never the full-res original).
  // The heavy CSS blur is aesthetic; the preview is already a non-revealing,
  // low-resolution image, so no interior detail leaks even via devtools.
  let displaySrc: string
  if (locked) {
    displaySrc = previewUrl || '/placeholder.svg'
  } else if (needsSignedUrl) {
    // Never fall back to the raw private path; show the placeholder until the
    // signed URL resolves (or if it fails), so the original stays protected.
    displaySrc = signedUrl || '/placeholder.svg'
  } else {
    displaySrc = src || '/placeholder.svg'
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      <img
        src={displaySrc}
        alt={locked ? 'Protected property photo — sign in to view' : alt}
        className={cn(
          'size-full object-cover transition-transform duration-500',
          locked && 'scale-105 blur-xl brightness-95',
        )}
      />
      {locked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/10 p-4 text-center text-foreground backdrop-blur-md">
          <span className="flex size-10 items-center justify-center rounded-full bg-white/70 text-foreground shadow-sm backdrop-blur-sm dark:bg-black/50 dark:text-white">
            <Lock className={cn(compact ? 'size-4' : 'size-5')} />
          </span>
          {!compact && (
            <>
              <p className="max-w-[16rem] text-sm font-medium text-balance">
                Protected photo — register or log in to unlock the full gallery.
              </p>
              <Button size="sm" variant="secondary" asChild className="mt-1">
                <Link href="/register">Unlock Photos</Link>
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
