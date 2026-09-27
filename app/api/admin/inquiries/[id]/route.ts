import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, writeAudit } from '@/lib/admin-guard'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * DELETE /api/admin/inquiries/[id] — permanently delete a lead message.
 *
 * Independently re-verifies admin auth (never trusts the client's `isAdmin`
 * state) and re-checks the target still exists before deleting, so a stale
 * UI can't produce a misleading audit entry.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  const rl = await checkRateLimit('adminDelete', `inquiry-delete:${ctx.userId}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin.from('inquiries').select('id').eq('id', id).maybeSingle()
  if (!existing) {
    return NextResponse.json({ error: 'This message no longer exists.' }, { status: 404 })
  }

  const { error } = await admin.from('inquiries').delete().eq('id', id)
  if (error) {
    console.log('[v0] admin inquiry delete failed:', error.message)
    return NextResponse.json({ error: 'Unable to delete this message.' }, { status: 400 })
  }

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: 'INQUIRY_DELETED',
    recordId: id,
    status: 'success',
    table: 'inquiries',
  })

  return NextResponse.json({ ok: true })
}