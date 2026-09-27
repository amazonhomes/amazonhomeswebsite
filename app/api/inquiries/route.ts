import { NextResponse, after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTeamOfLead } from '@/lib/lead-email'
import { checkRateLimit, clientIp } from '@/lib/rate-limit'
import { validatePhoneField } from '@/lib/phone'

/**
 * Inquiry / contact-form submission endpoint. This is the most abuse-prone
 * surface (fully public, no auth required), so it gets the same strict limiter
 * as the other lead forms plus server-side validation in front of the
 * RLS-guarded `inquiries` insert.
 */

const MAX = { text: 200, email: 320, phone: 50, message: 5000 }

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}

function validEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX.email
}

export async function POST(req: Request) {
  const { success } = await checkRateLimit('inquiry', clientIp(req))
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

  const name = str(body.name, MAX.text)
  const email = str(body.email, MAX.email)
  const message = str(body.message, MAX.message)

  if (!name || !validEmail(email) || !message) {
    return NextResponse.json({ ok: false, error: 'Please complete all required fields.' }, { status: 400 })
  }

  // Phone is optional on inquiries, but if provided it must be valid.
  const phoneCheck = validatePhoneField(body.phone, { required: false })
  if (!phoneCheck.ok) {
    return NextResponse.json({ ok: false, error: phoneCheck.error }, { status: 400 })
  }

  // property_id is optional (a general contact submission has none).
  const propertyId = typeof body.propertyId === 'string' && body.propertyId ? body.propertyId : null

  const supabase = await createClient()
  const { error } = await supabase.from('inquiries').insert({
    property_id: propertyId,
    name,
    // company / phone are optional in the form but NOT NULL in the schema.
    company: str(body.company, MAX.text) || '',
    email,
    phone: phoneCheck.value || '',
    message,
  })

  if (error) {
    console.log('[v0] Inquiry insert failed:', error.message)
    return NextResponse.json({ ok: false, error: 'Could not send your message.' }, { status: 400 })
  }

  const origin = new URL(req.url).origin
  after(() =>
    notifyTeamOfLead(supabase, origin, {
      type: 'inquiry',
      name,
      email,
      phone: phoneCheck.value || null,
      company: str(body.company, MAX.text) || null,
      propertyId,
      message,
    }),
  )

  return NextResponse.json({ ok: true })
}
