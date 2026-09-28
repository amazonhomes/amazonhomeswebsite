import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { checkRateLimit } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * DELETE /api/admin/showings/[id] — permanently delete ONE showing request.
 *
 * `requireAdmin()` re-derives the admin role (and aal2 MFA) from the session
 * cookie, and the delete runs through the caller's cookie-bound client so the
 * `showings_admin_delete` RLS policy (`is_admin()`) is enforced by Postgres as
 * well. No service-role key is used; the audit trigger records the delete.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid showing id.' }, { status: 400 })
  }

  const rl = await checkRateLimit('adminDelete', `showing-delete:${ctx.userId}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const { data, error } = await ctx.supabase.from('showings').delete().eq('id', id).select('id')
  if (error) {
    console.error('[admin/showings] delete failed', { id, code: error.code, message: error.message })
    return NextResponse.json({ error: 'Unable to delete this showing.' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'This showing no longer exists.' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}