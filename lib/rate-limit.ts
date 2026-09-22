import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Distributed, production-grade rate limiting backed by Upstash Redis.
 *
 * Why Redis and not an in-memory Map: on Vercel each serverless invocation may
 * run in a fresh isolate, so an in-process counter resets constantly and never
 * actually limits a determined caller. A shared Redis store enforces the limit
 * across every instance and region.
 *
 * Credentials are read from server-only env vars provided by the Upstash for
 * Redis integration. Depending on how the integration is provisioned these are
 * named either KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN, so we accept both. They are NEVER referenced from
 * client components, so nothing leaks to the browser.
 *
 * If the env vars are absent (e.g. the integration finished connecting but its
 * variables have not propagated yet, or a local checkout without the
 * integration) the limiter degrades open — requests are allowed — rather than
 * hard-failing legitimate traffic. Existing RLS, auth, and server-side
 * validation remain the primary security controls; rate limiting only blunts
 * abuse volume.
 */

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

const redis = url && token ? new Redis({ url, token }) : null

if (!redis) {
  console.log('[v0] Rate limiting disabled: Upstash Redis env vars are not configured.')
}

function makeLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1], prefix: string) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
    analytics: false,
  })
}

/**
 * Endpoint-specific limiters. Each has its own key prefix so filling out, say,
 * an offer and a showing request back-to-back does not consume the same budget.
 * Limits are deliberately generous enough for real users but tight enough to
 * stop scripted spam.
 */
export const limiters = {
  // Public/investor lead-generation forms.
  offer: makeLimiter(5, '10 m', 'rl:offer'),
  showing: makeLimiter(5, '10 m', 'rl:showing'),
  inquiry: makeLimiter(5, '10 m', 'rl:inquiry'),
  // Notification fan-out endpoint.
  notify: makeLimiter(10, '1 m', 'rl:notify'),
  // Password-recovery email requests. Abuse-sensitive (each success sends an
  // email), so this is deliberately the tightest limiter — a handful of
  // attempts per IP per quarter hour is plenty for a real user who mistypes.
  recover: makeLimiter(4, '15 m', 'rl:recover'),
  // --- Privileged admin account-management limiters (keyed by admin id) ---
  // Admin password re-authentication. Tight, to blunt brute-forcing the
  // current admin's password behind a valid admin session.
  adminReauth: makeLimiter(5, '10 m', 'rl:admin:reauth'),
  // Account creation (investor or admin).
  adminCreate: makeLimiter(10, '10 m', 'rl:admin:create'),
  // Account deletion (investor or admin).
  adminDelete: makeLimiter(10, '10 m', 'rl:admin:delete'),
  // Admin-initiated password-reset emails for a target account.
  adminReset: makeLimiter(5, '15 m', 'rl:admin:reset'),
}

export type LimiterName = keyof typeof limiters

/**
 * Derive the best-available client identifier in the Vercel environment.
 *
 * `x-forwarded-for` on Vercel is set by the platform edge; the FIRST entry is
 * the real client. We intentionally do not trust arbitrary client-supplied
 * values beyond these platform headers, and fall back to a constant bucket so a
 * missing header can never disable limiting entirely.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip')?.trim() || 'ip:unknown'
}

/**
 * Check a limiter for the given identifier. Returns `{ success: true }` when the
 * limiter is disabled (no Redis) so the app keeps working without the
 * integration.
 */
export async function checkRateLimit(
  name: LimiterName,
  identifier: string,
): Promise<{ success: boolean }> {
  const limiter = limiters[name]
  if (!limiter) return { success: true }
  const { success } = await limiter.limit(identifier)
  return { success }
}
