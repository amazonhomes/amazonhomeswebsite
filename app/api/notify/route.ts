import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Lead + reply notification endpoint.
 *
 * Integration-ready structure: when an email provider is configured via env
 * vars it sends the email, otherwise it safely no-ops so the app runs without
 * any secrets. All credentials stay server-side — nothing here is exposed to
 * the browser.
 *
 * Security model (closes the "open relay" hole):
 *   - The recipient is ALWAYS derived server-side, never trusted from the body.
 *   - Lead notifications (offer/showing/inquiry submissions) are public but can
 *     only ever be delivered to the team's own inbox (LEAD_NOTIFICATION_EMAIL).
 *   - Reply notifications require an authenticated Supabase session and are only
 *     delivered to a recipient tied to the caller's own inquiry record:
 *       admin    → the investor's email on that inquiry
 *       investor → the team inbox (only for an inquiry they own)
 *   - Per-IP rate limiting + payload caps blunt spam/abuse.
 *
 * To enable email, set:
 *   RESEND_API_KEY          – provider API key (server-only)
 *   LEAD_NOTIFICATION_EMAIL – team recipient inbox (e.g. team@amazonhomes.com)
 *   LEAD_NOTIFICATION_FROM  – optional verified "from" address
 */

const LEAD_TYPES = new Set(['offer', 'showing', 'inquiry'])
const MAX_SUBJECT = 200
const MAX_SUMMARY = 5000

async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<{ ok: boolean; delivered: boolean; status?: number }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || !opts.to) {
    // Provider not configured yet — wiring is ready, delivery is disabled.
    console.log(`[v0] Notification (email disabled) → ${opts.to || 'no recipient'}: ${opts.subject}`)
    return { ok: true, delivered: false }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.LEAD_NOTIFICATION_FROM ?? 'Amazon Homes <onboarding@resend.dev>',
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    if (!res.ok) {
      console.log('[v0] Notification email failed:', await res.text())
      return { ok: false, delivered: false, status: 502 }
    }
    return { ok: true, delivered: true }
  } catch (err) {
    console.log('[v0] Notification email error:', (err as Error).message)
    return { ok: false, delivered: false, status: 502 }
  }
}

export async function POST(req: Request) {
  const { success } = await checkRateLimit('notify', clientIp(req))
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    )
  }

  let payload: {
    type?: string
    subject?: string
    summary?: string
    inquiryId?: string
  }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }

  const type = typeof payload.type === 'string' ? payload.type : ''

  // ── Reply flow: authenticated, recipient derived from the DB record ────────
  if (type === 'reply') {
    const inquiryId = typeof payload.inquiryId === 'string' ? payload.inquiryId : ''
    if (!inquiryId) {
      return NextResponse.json({ ok: false, error: 'Missing inquiryId' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // RLS scopes this: admins see any inquiry, investors only their own.
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('name, email, replies')
      .eq('id', inquiryId)
      .maybeSingle()
    if (!inquiry) {
      return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const isAdmin = profile?.role === 'admin'
    const ownsInquiry =
      (user.email ?? '').toLowerCase() === String(inquiry.email ?? '').toLowerCase()

    // Only the admin or the inquiry's owner may trigger a reply email.
    if (!isAdmin && !ownsInquiry) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const replies = Array.isArray(inquiry.replies) ? inquiry.replies : []
    const last = replies[replies.length - 1] as
      | { body?: string; author?: string }
      | undefined
    const body = String(last?.body ?? '').slice(0, MAX_SUMMARY)
    const author = String(last?.author ?? 'Amazon Homes team').slice(0, MAX_SUBJECT)

    const teamInbox = process.env.LEAD_NOTIFICATION_EMAIL
    const result = isAdmin
      ? await sendEmail({
          to: String(inquiry.email ?? ''),
          subject: 'New reply from Amazon Homes about your inquiry',
          text: `${author} replied to your inquiry:\n\n${body}`,
        })
      : await sendEmail({
          to: teamInbox ?? '',
          subject: `New reply from ${String(inquiry.name ?? 'an investor').slice(0, MAX_SUBJECT)}`,
          text: `${String(inquiry.name ?? '')} (${String(inquiry.email ?? '')}) replied:\n\n${body}`,
          replyTo: String(inquiry.email ?? '') || undefined,
        })

    return NextResponse.json(
      { ok: result.ok, delivered: result.delivered },
      { status: result.status ?? 200 },
    )
  }

  // ── Lead flow: public, but only ever delivered to the team's own inbox ─────
  if (!LEAD_TYPES.has(type)) {
    return NextResponse.json({ ok: false, error: 'Invalid type' }, { status: 400 })
  }
  const summary = typeof payload.summary === 'string' ? payload.summary.slice(0, MAX_SUMMARY) : ''
  if (!summary) {
    return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
  }
  const subject =
    typeof payload.subject === 'string' && payload.subject
      ? payload.subject.slice(0, MAX_SUBJECT)
      : `New ${type}`

  const teamInbox = process.env.LEAD_NOTIFICATION_EMAIL
  const result = await sendEmail({ to: teamInbox ?? '', subject, text: summary })
  return NextResponse.json(
    { ok: result.ok, delivered: result.delivered },
    { status: result.status ?? 200 },
  )
}
