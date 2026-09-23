import { Redis } from '@upstash/redis'
import { detroitDayKey } from '@/lib/timezone'

/**
 * Privacy-conscious site-visit counting backed by Upstash Redis.
 *
 * We deliberately store ONLY an aggregate integer per calendar day
 * (America/Detroit). No IP, user id, user-agent, path, or any other
 * per-visitor data is persisted, so there is nothing to correlate back to an
 * individual. This is a traffic-volume signal for the admin dashboard, not an
 * analytics/identity system.
 *
 * Keys look like `visits:2026-09-23` and are given a generous TTL so the store
 * self-prunes and never grows unbounded — we only ever chart a trailing window.
 *
 * Credentials come from the same server-only env vars the rate limiter uses
 * (KV_REST_API_* or UPSTASH_REDIS_REST_*). If they are absent the helper
 * degrades to a no-op / zeroes rather than throwing, so the site keeps working
 * without the integration.
 */

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

// Keep raw daily counters around for well over the charted window so a 90-day
// view is always fully backed, then let Redis evict them automatically.
const VISIT_TTL_SECONDS = 60 * 60 * 24 * 120 // 120 days

function visitKey(dayKey: string): string {
  return `visits:${dayKey}`
}

/**
 * Increment today's aggregate visit counter by one. Best-effort: any Redis
 * error is swallowed so a tracking ping can never break a page render.
 */
export async function recordVisit(now: Date = new Date()): Promise<void> {
  if (!redis) return
  const key = visitKey(detroitDayKey(now))
  try {
    const count = await redis.incr(key)
    // Only set the TTL when the key is first created (count === 1) so we don't
    // keep pushing the expiry out on every hit.
    if (count === 1) {
      await redis.expire(key, VISIT_TTL_SECONDS)
    }
  } catch (err) {
    console.log('[v0] recordVisit failed (non-fatal):', (err as Error).message)
  }
}

/**
 * Read aggregate visit counts for an explicit list of day keys (each
 * `YYYY-MM-DD` in America/Detroit). Returns a map keyed by day with 0 for any
 * day that has no stored counter. Uses a single MGET round-trip.
 */
export async function getVisitCounts(dayKeys: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const day of dayKeys) result[day] = 0
  if (!redis || dayKeys.length === 0) return result

  try {
    const keys = dayKeys.map(visitKey)
    const values = await redis.mget<(number | string | null)[]>(...keys)
    dayKeys.forEach((day, i) => {
      const raw = values[i]
      const n = typeof raw === 'number' ? raw : raw ? Number.parseInt(raw, 10) : 0
      result[day] = Number.isFinite(n) ? n : 0
    })
  } catch (err) {
    console.log('[v0] getVisitCounts failed (non-fatal):', (err as Error).message)
  }
  return result
}
