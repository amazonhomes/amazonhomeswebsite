import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Offer submission endpoint.
 *
 * Wraps the Supabase insert in distributed rate limiting + server-side
 * validation. RLS on `offers` is still the authority on what may be written;
 * this route runs the insert through the caller's session cookie, so an
 * anonymous or investor caller is constrained exactly as before.
 */

const MAX = { text: 200, email: 320, phone: 50, notes: 5000 }
const MAX_AMOUNT = 1_000_000_000_000 // $1T sanity ceiling

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX.email
}

export async function POST(req: Request) {
  const { success } = await checkRateLimit('offer', clientIp(req))
  if (!success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const propertyId = str(body.propertyId, MAX.text)
  const name = str(body.name, MAX.text)
  const email = str(body.email, MAX.email)
  const amountRaw = Number(body.amount)

  if (!propertyId || !name || !validEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Please complete all required fields.' }, { status: 400 })
  }
  if (!Number.isFinite(amountRaw) || amountRaw <= 0 || amountRaw > MAX_AMOUNT) {
    return NextResponse.json({ ok: false, error: 'Enter a valid offer amount.' }, { status: 400 })
  }

  

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // Authoritative deadline/status gate. The client also hides the CTA past the
  // deadline, but that is cosmetic — this is the real enforcement point, so a
  // crafted request or a client clock skew cannot slip in a late offer.
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('status, offer_deadline')
    .eq('id', propertyId)
    .maybeSingle()

  if (propError || !property) {
    return NextResponse.json({ ok: false, error: 'Property not found.' }, { status: 404 })
  }
  if (property.status !== 'available' && property.status !== 'under-contract') {
    return NextResponse.json(
      { ok: false, error: 'This property is no longer accepting offers.' },
      { status: 409 },
    )
  }
  if (property.offer_deadline && new Date(property.offer_deadline).getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: 'Offer submission for this property has closed.' },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('offers').insert({
    property_id: propertyId,
    user_id: userId,
    name,
    // company / phone / notes are optional in the form but NOT NULL in the
    // schema (default ''). Persist empty strings, never null, or the insert
    // is rejected by the NOT NULL constraint.
    company: str(body.company, MAX.text),
    email,
    phone: str(body.phone, MAX.phone),
    amount: Math.round(amountRaw),
    notes: str(body.notes, MAX.notes),
  })

  if (error) {
    console.log('[v0] Offer insert failed:', error.message)
    return NextResponse.json({ ok: false, error: 'Could not submit your offer.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
