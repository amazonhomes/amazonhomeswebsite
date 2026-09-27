import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, writeAudit } from '@/lib/admin-guard'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail, escapeHtml, escapeHtmlMultiline } from '@/lib/lead-email'

const MAX_MESSAGE_LENGTH = 5000

/**
 * POST /api/admin/inquiries/[id]/reply — admin sends an email reply directly
 * to the lead.
 *
 * The recipient is ALWAYS derived server-side from the inquiry's own `email`
 * column — the client only supplies the message body, never a recipient —
 * closing the open-relay risk the audit flagged. On success the reply is
 * appended to the in-app thread and the inquiry is marked responded/read;
 * on delivery failure nothing is persisted, so the UI never shows a reply
 * that was never actually sent.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  const rl = await checkRateLimit('adminReset', `inquiry-reply:${ctx.userId}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Unable to complete this action.' }, { status: 400 })
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) return NextResponse.json({ error: 'Enter a reply message.' }, { status: 400 })
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Reply is too long.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: inquiry } = await admin
    .from('inquiries')
    .select('id, name, email, replies, read_at')
    .eq('id', id)
    .maybeSingle()
  if (!inquiry) {
    return NextResponse.json({ error: 'This message no longer exists.' }, { status: 404 })
  }
  const to = String(inquiry.email ?? '').trim()
  if (!to) {
    return NextResponse.json({ error: 'This lead has no email on file.' }, { status: 400 })
  }

  const leadName = String(inquiry.name ?? 'there')
  const result = await sendEmail({
    to,
    subject: 'A reply from Amazon Homes about your inquiry',
    text: `Hi ${leadName},\n\n${message}\n\n— Amazon Homes team`,
    html: `<p>Hi ${escapeHtml(leadName)},</p><p>${escapeHtmlMultiline(message)}</p><p>— Amazon Homes team</p>`,
    replyTo: process.env.LEAD_NOTIFICATION_EMAIL || undefined,
  })
  if (!result.ok) {
    return NextResponse.json({ error: 'The reply could not be sent. Please try again.' }, { status: 502 })
  }

  const reply = {
    id: crypto.randomUUID(),
    body: message,
    author: 'Amazon Homes team',
    authorRole: 'admin' as const,
    createdAt: new Date().toISOString(),
  }
  const nextReplies = [...(Array.isArray(inquiry.replies) ? inquiry.replies : []), reply]
  const readAt = inquiry.read_at ?? new Date().toISOString()

  const { error: updateErr } = await admin
    .from('inquiries')
    .update({ replies: nextReplies, status: 'responded', read_at: readAt })
    .eq('id', id)
  if (updateErr) {
    console.log('[v0] admin inquiry reply persist failed:', updateErr.message)
    // The email already went out; tell the admin so they don't resend it.
    return NextResponse.json(
      { error: 'The reply was sent, but the conversation could not be updated. Refresh to see the latest state.' },
      { status: 500 },
    )
  }

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: 'INQUIRY_REPLIED',
    recordId: id,
    status: 'success',
    table: 'inquiries',
  })

  return NextResponse.json({
    ok: true,
    inquiry: { replies: nextReplies, status: 'responded', readAt },
  })
}