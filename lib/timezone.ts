/**
 * Business timezone for all property deadlines. Properties are Metro Detroit
 * listings, so deadlines are entered and displayed in Eastern time. We use the
 * IANA zone (not a fixed UTC offset) so EST/EDT and DST transitions are handled
 * correctly. The database always stores the resulting absolute instant as
 * `timestamptz`; this module only converts between that instant and the
 * business-zone wall-clock representation the admin edits and visitors read.
 */
export const BUSINESS_TIMEZONE = 'America/Detroit'

/** Short label shown next to times in the UI (e.g. "8:00 PM ET"). */
export const BUSINESS_TZ_LABEL = 'ET'

/**
 * Offset (in ms) of `timeZone` from UTC at the given absolute instant.
 * Positive when the zone is behind UTC (Detroit is always behind UTC).
 * Computed via Intl so DST is applied for that specific instant.
 */
function tzOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(instant)
  const map: Record<string, number> = {}
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  // Intl can emit hour "24" at midnight; normalize to 0.
  const hour = map.hour === 24 ? 0 : map.hour
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUtc - instant.getTime()
}

/**
 * Convert a `datetime-local` value ("YYYY-MM-DDTHH:mm"), interpreted as wall
 * time in the business timezone, into an absolute UTC ISO string. Returns null
 * for empty/invalid input. Two-pass to resolve the offset across a DST edge.
 */
export function zonedInputToUtcIso(localValue: string): string | null {
  if (!localValue) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localValue)
  if (!m) return null
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[]
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi)
  const off1 = tzOffsetMs(BUSINESS_TIMEZONE, new Date(utcGuess))
  const off2 = tzOffsetMs(BUSINESS_TIMEZONE, new Date(utcGuess - off1))
  const instant = utcGuess - off2
  const date = new Date(instant)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Convert an absolute UTC ISO string into a `datetime-local` value expressed in
 * the business timezone, for prefilling the admin picker. Empty string when the
 * input is missing/invalid.
 */
export function utcIsoToZonedInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day}T${hour}:${map.minute}`
}

/**
 * Human-readable deadline in the business timezone, e.g.
 * "Sep 28, 2026 · 8:00 PM ET". Deterministic across server/client because it
 * pins both the timestamp and the timezone.
 */
export function formatDeadline(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
  return `${formatted} ${BUSINESS_TZ_LABEL}`
}

/**
 * Calendar-day key ("YYYY-MM-DD") for an absolute instant, expressed in the
 * business timezone. Used to bucket time-series data (e.g. daily visit counts)
 * on the same day boundaries the rest of the app and the analytics RPC use, so
 * a visit at 11pm ET lands on the correct local day rather than rolling over in
 * UTC.
 */
export function detroitDayKey(instant: Date = new Date()): string {
  if (Number.isNaN(instant.getTime())) instant = new Date()
  // en-CA formats as YYYY-MM-DD, which is exactly the key shape we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant)
}

/** Date-only portion of the deadline in the business timezone ("Sep 28, 2026"). */
export function formatDeadlineDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}
