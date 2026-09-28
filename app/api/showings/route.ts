import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTeamOfLead } from '@/lib/lead-email'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { validatePhoneField } from '@/lib/phone'
import { validateShowingSlot } from '@/lib/showing-schedule'

/**
 * Showing-request submission endpoint. Distributed rate limiting + server-side
 * validation in front of the RLS-guarded `showings` insert.
 */

const MAX = { text: 200, email: 320, phone: 50, message: 5000 }

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX.email
}

export async function POST(req: Request) {
  const { success } = await checkRateLimit('showing', clientIp(req))
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

  if (!propertyId || !name || !validEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Please complete all required fields.' }, { status: 400 })
  }
  // Phone is required on showing requests and must be a valid number.
  const phoneCheck = validatePhoneField(body.phone, { required: true })
  if (!phoneCheck.ok) {
    return NextResponse.json({ ok: false, error: phoneCheck.error }, { status: 400 })
  }
  // Appointment is chosen as Detroit wall time; the server re-derives the
  // instant and rejects malformed or past slots regardless of the client.
  const slot = validateShowingSlot(body.preferredDate, body.preferredSlot)
  if (!slot.ok) {
    return NextResponse.json({ ok: false, error: slot.error }, { status: 400 })
  }


  const supabase = await createClient()
   // Attribution comes from the authenticated session, never the request body.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null
  const { error } = await supabase.from('showings').insert({
    property_id: propertyId,
    user_id: userId,
    name,
    company: str(body.company, MAX.text) || null,
    email,
    phone: phoneCheck.value,
    preferred_time: str(body.preferredTime, MAX.text) || null,
    message: str(body.message, MAX.message) || null,
  })

  if (error) {
    console.log('[v0] Showing insert failed:', error.message)
    return NextResponse.json({ ok: false, error: 'Could not submit your request.' }, { status: 400 })
  }
  const origin = new URL(req.url).origin
  after(() =>
    notifyTeamOfLead(supabase, origin, {
      type: 'showing',
      name,
      email,
      phone: phoneCheck.value,
      company: str(body.company, MAX.text) || null,
      propertyId,
      preferredTime: str(body.preferredTime, MAX.text) || null,
      message: str(body.message, MAX.message) || null,
    }),
  )

  return NextResponse.json({ ok: true })
}
