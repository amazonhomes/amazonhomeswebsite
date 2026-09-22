'use client'

import { CalendarClock, TimerOff } from 'lucide-react'
import { formatDeadlineDate } from '@/lib/timezone'
import { formatRemaining, useCountdown } from '@/lib/use-countdown'

/**
 * Renders the offer-submission deadline block: the fixed due date plus a live
 * "remaining" readout that ticks down in the browser. When the deadline passes
 * it switches to a closed state. The remaining time is derived from the
 * absolute deadline instant, so it is identical for every visitor regardless of
 * their local timezone.
 */
export function OfferCountdown({ deadline }: { deadline: string }) {
  const countdown = useCountdown(deadline)
  const closed = countdown?.expired ?? false

  if (closed) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
        <TimerOff className="size-4 shrink-0" />
        Offer submission closed
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 rounded-md bg-accent/15 px-3 py-2">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CalendarClock className="size-4 shrink-0 text-accent" />
        Offers due {formatDeadlineDate(deadline)}
      </p>
      {/* Reserve a line so layout doesn't jump between SSR and first client tick. */}
      <p className="pl-6 text-sm tabular-nums text-muted-foreground" aria-live="polite">
        {countdown ? formatRemaining(countdown) : '\u00A0'}
      </p>
    </div>
  )
}
