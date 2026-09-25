import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { validatePhoneField } from '@/lib/phone'

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

  const userId = typeof body.userId === 'string' ? body.userId : null

  const supabase = await createClient()
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

  return NextResponse.json({ ok: true })
}
