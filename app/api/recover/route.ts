import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { getAuthCallbackUrl } from '@/lib/site'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Password-recovery request endpoint.
 *
 * Routing the reset-email request through the server (rather than calling
 * `resetPasswordForEmail` directly from the browser) buys two things the
 * client cannot:
 *   1. Collective, IP-based rate limiting via the shared Upstash limiter, so a
 *      script cannot fan out reset emails.
 *   2. A single, constant response shape. We NEVER reveal whether the email is
 *      registered — a valid unknown email and a real account produce the exact
 *      same `{ ok: true }`, defeating account enumeration.
 *
 * The only non-generic response is a 429 when the IP exceeds the limiter; that
 * signals request volume, not account existence, so it leaks nothing.
 */
export async function POST(req: Request) {
  let email = ''
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  } catch {
    // Malformed body — fall through; still rate-limited and still generic.
  }

  const { success } = await checkRateLimit('recover', clientIp(req))
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429 },
    )
  }

  // Only attempt a send for a well-formed address, but never surface validity.
  if (EMAIL_RE.test(email)) {
    const redirectTo = appendNext(getAuthCallbackUrl(), '/reset-password')
    try {
      const supabase = await createClient()
      // Ignore the outcome: an unknown email, a send failure, and a success
      // must all look identical to the caller.
      await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    } catch {
      // Swallow — never leak provider/auth errors to the client.
    }
  }

  return NextResponse.json({ ok: true })
}

/** Append a `next` destination to the recovery redirect target. The v0 proxy
 *  forwards this through to the app's /auth/callback, which honors `next`. */
function appendNext(base: string, next: string): string {
  try {
    const u = new URL(base)
    u.searchParams.set('next', next)
    return u.toString()
  } catch {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}next=${encodeURIComponent(next)}`
  }
}
