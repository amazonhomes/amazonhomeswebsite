'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function LockedImage({
  src,
  alt,
  locked,
  previewUrl,
  className,
  compact = false,
}: {
  src: string
  alt: string
  locked: boolean
  /** Safe low-res/blurred stand-in shown when `locked`. The full-resolution
   *  `src` is never rendered while locked, so the original stays private. */
  previewUrl?: string | null
  className?: string
  compact?: boolean
}) {
  // When locked, render ONLY the safe preview (never the full-res original).
  // The heavy CSS blur is aesthetic; the preview is already a non-revealing,
  // low-resolution image, so no interior detail leaks even via devtools.
  const displaySrc = locked ? previewUrl || '/placeholder.svg' : src || '/placeholder.svg'

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
