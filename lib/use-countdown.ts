'use client'

import { useEffect, useState } from 'react'

export interface Countdown {
  /** True once the absolute deadline instant has passed. */
  expired: boolean
  days: number
  hours: number
  minutes: number
  seconds: number
}

function compute(target: number): Countdown {
  const diff = target - Date.now()
  const clamped = Math.max(0, diff)
  const totalSeconds = Math.floor(clamped / 1000)
  return {
    expired: diff <= 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

/**
 * Live countdown to an absolute deadline (ISO timestamp). Returns null until
 * mounted on the client — this keeps the server-rendered markup free of any
 * time-dependent output, avoiding hydration mismatches. The remaining duration
 * is always derived from the absolute instant, so a visitor's local timezone
 * never changes the result.
 */
export function useCountdown(deadlineIso: string | null | undefined): Countdown | null {
  const [state, setState] = useState<Countdown | null>(null)

  useEffect(() => {
    if (!deadlineIso) {
      setState(null)
      return
    }
    const target = new Date(deadlineIso).getTime()
    if (Number.isNaN(target)) {
      setState(null)
      return
    }
    setState(compute(target))
    const id = setInterval(() => setState(compute(target)), 1000)
    return () => clearInterval(id)
  }, [deadlineIso])

  return state
}

/** "6 days 14 hours 32 minutes remaining", collapsing to finer units as it shrinks. */
export function formatRemaining(c: Countdown): string {
  if (c.expired) return ''
  const unit = (n: number, label: string) => `${n} ${label}${n === 1 ? '' : 's'}`
  if (c.days > 0) {
    return `${unit(c.days, 'day')} ${unit(c.hours, 'hour')} ${unit(c.minutes, 'minute')} remaining`
  }
  if (c.hours > 0) {
    return `${unit(c.hours, 'hour')} ${unit(c.minutes, 'minute')} remaining`
  }
  if (c.minutes > 0) {
    return `${unit(c.minutes, 'minute')} ${unit(c.seconds, 'second')} remaining`
  }
  return `${unit(c.seconds, 'second')} remaining`
}
