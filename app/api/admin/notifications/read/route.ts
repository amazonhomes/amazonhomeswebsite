import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-guard'
import { checkRateLimit } from '@/lib/rate-limit'

const KINDS = ['offer', 'showing', 'inquiry'] as const
type Kind = (typeof KINDS)[number]

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const MAX_RECEIPTS = 5000

function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/**
 * GET /api/admin/notifications/read — the calling admin's own read receipts.
 *
 * `requireAdmin()` re-derives admin role + aal2 from the session cookie, and the
 * query runs through the caller's cookie-bound client, so the
 * `notification_reads_select_own` RLS policy scopes rows to `auth.uid()` too.
 */
export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard

  const { data, error } = await ctx.supabase
    .from('admin_notification_reads')
    .select('notification_id, notification_kind')
    .eq('admin_id', ctx.userId)
    .order('read_at', { ascending: false })
    .limit(MAX_RECEIPTS)

  if (error) {
    console.error('[admin/notifications/read] load failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Unable to load notification state.' }, { status: 500 })
  }

  return NextResponse.json({
    reads: (data ?? []).map((r) => ({ notificationId: r.notification_id, kind: r.notification_kind })),
  })
}

/**
 * POST /api/admin/notifications/read — mark one notification read for the
 * calling admin. The admin id always comes from the session, never the body.
 * Idempotent: ON CONFLICT DO NOTHING against the (admin, id, kind) unique key.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { notificationId, kind } = (body ?? {}) as { notificationId?: unknown; kind?: unknown }
  if (!isKind(kind)) {
    return NextResponse.json({ error: 'Invalid notification kind.' }, { status: 400 })
  }
  if (typeof notificationId !== 'string' || !ID_RE.test(notificationId) || !notificationId.startsWith(`${kind}-`)) {
    return NextResponse.json({ error: 'Invalid notification id.' }, { status: 400 })
  }

  const rl = await checkRateLimit('adminNotificationRead', `notification-read:${ctx.userId}`)
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  const { error } = await ctx.supabase
    .from('admin_notification_reads')
    .upsert(
      { admin_id: ctx.userId, notification_id: notificationId, notification_kind: kind },
      { onConflict: 'admin_id,notification_id,notification_kind', ignoreDuplicates: true },
    )

  if (error) {
    console.error('[admin/notifications/read] insert failed', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Could not mark notification as read.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}