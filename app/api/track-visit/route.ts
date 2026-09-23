import { NextResponse } from 'next/server'
import { recordVisit } from '@/lib/visits'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Public endpoint that records a single aggregate site visit for today.
 *
 * Privacy: this stores NOTHING about the caller — only a per-day integer is
 * incremented in Redis (see lib/visits.ts). The IP is used transiently for
 * rate limiting so a script cannot inflate the counter, and is never persisted.
 *
 * The client pings this at most once per browser session (see VisitTracker), so
 * the count approximates unique sessions rather than raw page loads.
 */
export async function POST(req: Request) {
  // Blunt obvious inflation without affecting real one-ping-per-session users.
  const { success } = await checkRateLimit('notify', `visit:${clientIp(req)}`)
  if (!success) {
    // Silently accept without counting — no reason to surface an error to a
    // fire-and-forget beacon.
    return NextResponse.json({ ok: true })
  }

  await recordVisit()
  return NextResponse.json({ ok: true })
}
