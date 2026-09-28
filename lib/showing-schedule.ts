import {
  BUSINESS_TIMEZONE,
  BUSINESS_TZ_LABEL,
  detroitDayKey,
  utcIsoToZonedInput,
  zonedInputToUtcIso,
} from '@/lib/timezone'

/**
 * Showing appointment window, expressed as Detroit wall-clock time. Shared by
 * the request form (to render slots) and the API (to validate them), so the
 * two can never disagree about what a bookable slot is.
 */
export const SHOWING_HOURS = { startMinutes: 9 * 60, endMinutes: 19 * 60, stepMinutes: 30 }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** All bookable slots as "HH:mm" (24h), e.g. "09:00" … "19:00". */
export const SHOWING_TIME_SLOTS: string[] = (() => {
  const slots: string[] = []
  const { startMinutes, endMinutes, stepMinutes } = SHOWING_HOURS
  for (let m = startMinutes; m <= endMinutes; m += stepMinutes) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return slots
})()

/** "14:30" -> "2:30 PM". Pure string math, so it never depends on the browser zone. */
export function formatSlotLabel(slot: string): string {
  const m = TIME_RE.exec(slot)
  if (!m) return slot
  const h = Number(m[1])
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m[2]} ${suffix}`
}

/** Today's date key ("YYYY-MM-DD") in Detroit. */
export function detroitTodayKey(now: Date = new Date()): string {
  return detroitDayKey(now)
}

/**
 * Turn a calendar-picked Date into a "YYYY-MM-DD" key using the day the user
 * clicked. react-day-picker yields local-midnight Dates, so we read local
 * fields; the key is then interpreted as a Detroit date downstream.
 */
export function calendarDateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Inverse of calendarDateToKey: a local-midnight Date for a "YYYY-MM-DD" key. */
export function keyToCalendarDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Slots still bookable on `dateKey` (drops slots already past in Detroit when it's today). */
export function availableSlots(dateKey: string, now: Date = new Date()): string[] {
  return SHOWING_TIME_SLOTS.filter((slot) => {
    const iso = zonedInputToUtcIso(`${dateKey}T${slot}`)
    return iso !== null && new Date(iso).getTime() > now.getTime()
  })
}

export type ShowingSlotResult =
  | { ok: true; iso: string; label: string }
  | { ok: false; error: string }

/**
 * Authoritative validation for a requested appointment. Rejects malformed or
 * impossible dates (e.g. 2026-02-31), times outside the configured slot grid,
 * nonexistent DST wall times, and anything not strictly in the future in
 * Detroit. Returns the absolute instant to store.
 */
export function validateShowingSlot(
  dateKey: unknown,
  slot: unknown,
  now: Date = new Date(),
): ShowingSlotResult {
  if (typeof dateKey !== 'string' || !dateKey) {
    return { ok: false, error: 'Please choose a showing date.' }
  }
  if (typeof slot !== 'string' || !slot) {
    return { ok: false, error: 'Please choose a showing time.' }
  }
  if (!DATE_RE.test(dateKey)) return { ok: false, error: 'Invalid showing date.' }
  if (!TIME_RE.test(slot) || !SHOWING_TIME_SLOTS.includes(slot)) {
    return { ok: false, error: 'Invalid showing time.' }
  }
  const wall = `${dateKey}T${slot}`
  const iso = zonedInputToUtcIso(wall)
  // Round-trip catches rolled-over dates (Feb 31) and DST-gap wall times.
  if (!iso || utcIsoToZonedInput(iso) !== wall) {
    return { ok: false, error: 'Invalid showing date.' }
  }
  if (new Date(iso).getTime() <= now.getTime()) {
    return {
      ok: false,
      error: 'That time has already passed in Detroit. Please pick a later time.',
    }
  }
  return { ok: true, iso, label: formatShowingLong(iso) }
}

function detroitParts(iso: string, opts: Intl.DateTimeFormatOptions): string | null {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIMEZONE, ...opts }).format(date)
}

/** "Oct 5, 2026 · 2:30 PM ET" — compact form for tables. */
export function formatShowingShort(iso: string | null | undefined): string {
  if (!iso) return ''
  const day = detroitParts(iso, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = detroitParts(iso, { hour: 'numeric', minute: '2-digit' })
  return day && time ? `${day} · ${time} ${BUSINESS_TZ_LABEL}` : ''
}

/** "October 5, 2026 at 2:30 PM ET" — long form for emails and messages. */
export function formatShowingLong(iso: string | null | undefined): string {
  if (!iso) return ''
  const day = detroitParts(iso, { month: 'long', day: 'numeric', year: 'numeric' })
  const time = detroitParts(iso, { hour: 'numeric', minute: '2-digit' })
  return day && time ? `${day} at ${time} ${BUSINESS_TZ_LABEL}` : ''
}

/**
 * Display text for any showing record: the exact appointment when one was
 * picked, otherwise the legacy free-text preference (or a neutral fallback).
 */
export function showingPreferenceText(
  s: { preferredAt?: string | null; preferredTime?: string | null },
  variant: 'short' | 'long' = 'short',
): string {
  const exact = variant === 'short' ? formatShowingShort(s.preferredAt) : formatShowingLong(s.preferredAt)
  if (exact) return exact
  const legacy = typeof s.preferredTime === 'string' ? s.preferredTime.trim() : ''
  return legacy || 'Not specified'
}