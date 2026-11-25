'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isPrivateStoragePath } from '@/lib/property-images'

// Throw on failure (rather than resolving null) so SWR treats it as an error
// and applies its bounded retry instead of caching a permanent miss.
async function fetchSignedUrl(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Signed URL request failed: ${res.status}`)
  const data = (await res.json().catch(() => null)) as { url?: string } | null
  if (!data?.url) throw new Error('Signed URL missing from response')
  return data.url
}

export function LockedImage({
  src,
  alt,
  locked,
  previewUrl,
  propertyId,
  className,
  compact = false,
  deferSignedUrl = false,
  priority = false,
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
  /** Defer private signed-URL work for offscreen thumbnail instances. */
  deferSignedUrl?: boolean
  priority?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(!deferSignedUrl)
  const [failedSignedUrl, setFailedSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!deferSignedUrl) {
      setIsNearViewport(true)
      return
    }

    const element = containerRef.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsNearViewport(true)
        observer.disconnect()
      },
      { rootMargin: '250px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [deferSignedUrl])

  const isProtectedPrivatePath = !locked && isPrivateStoragePath(src)
  const shouldLoadSignedUrl = !deferSignedUrl || isNearViewport
  const needsSignedUrl = isProtectedPrivatePath && Boolean(propertyId) && shouldLoadSignedUrl
  const { data: signedUrl, error: signedUrlError, mutate } = useSWR(
    needsSignedUrl
      ? `/api/property-images/signed-url?propertyId=${encodeURIComponent(
          propertyId as string,
        )}&path=${encodeURIComponent(src)}`
      : null,
    fetchSignedUrl,
    { revalidateOnFocus: false, refreshInterval: 8 * 60 * 1000, errorRetryCount: 2 },
  )

  // If a signed URL fails to load (e.g. it expired while the tab slept),
  // re-sign exactly once per URL. A genuinely missing object falls back to a
  // quiet unavailable state instead of looping on fresh tokens.
  const resignedPaths = useRef(new Set<string>())
  const handleImageError = () => {
    if (!needsSignedUrl || !signedUrl || resignedPaths.current.has(src)) {
      if (signedUrl) setFailedSignedUrl(signedUrl)
      return
    }
    resignedPaths.current.add(src)
    setFailedSignedUrl(signedUrl)
    void mutate()
      .then((freshUrl) => {
        if (freshUrl && freshUrl !== signedUrl) setFailedSignedUrl(null)
      })
      .catch(() => undefined)
  }

  const displaySrc = locked
    ? previewUrl || '/placeholder.svg'
    : isProtectedPrivatePath
      ? signedUrl && signedUrl !== failedSignedUrl
        ? signedUrl
        : null
      : src || '/placeholder.svg'
  const privateImageUnavailable =
    isProtectedPrivatePath &&
    (!propertyId || Boolean(signedUrlError || failedSignedUrl)) &&
    !displaySrc
  const isResolvingPrivateImage =
    isProtectedPrivatePath && Boolean(propertyId) && !displaySrc && !signedUrlError

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-muted', className)}>
      {displaySrc ? (
        <img
          src={displaySrc}
          onError={handleImageError}
          alt={locked ? 'Protected property photo — sign in to view' : alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={cn(
            'size-full object-cover transition-transform duration-500',
            locked && 'scale-105 blur-xl brightness-95',
          )}
        />
      ) : (
        <div
          aria-label={privateImageUnavailable ? 'Photo unavailable' : 'Loading protected photo'}
          role="img"
          className={cn(
            'size-full bg-muted',
            isResolvingPrivateImage && shouldLoadSignedUrl && 'animate-pulse',
          )}
        >
          {privateImageUnavailable && (
            <span className="sr-only">Photo unavailable</span>
          )}
        </div>
      )}
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
