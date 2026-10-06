import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import { isStage } from '@/lib/transactions'
import {
  TX_COLUMNS,
  guardTransactions,
  isUuid,
  jsonError,
  loadFields,
  mapTransaction,
  mirroredColumns,
  readJson,
  validateValues,
} from '@/lib/transactions-server'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/admin/transactions/[id]/stage — move the SAME record between
 * stages. Only `stage` changes plus any closing values confirmed in the
 * dialog; every existing value, document, created date and audit row stays.
 */
export async function POST(req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Transaction not found.', 404)

  const body = await readJson(req)
  if (!body || !isStage(body.stage)) return jsonError('Invalid stage.', 400)
  const target = body.stage

  const { data: existing, error: loadError } = await ctx.supabase
    .from('transactions')
    .select('stage, field_values')
    .eq('id', id)
    .maybeSingle()
  if (loadError) return jsonError('Unable to load transaction.', 500)
  if (!existing) return jsonError('Transaction not found.', 404)
  if (existing.stage === target) return jsonError('Transaction is already in that stage.', 409)

  const fields = await loadFields(ctx.supabase, target)
  if (!fields) return jsonError('Unable to load columns.', 500)
  const parsed = validateValues(body.values, fields)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const { data, error } = await ctx.supabase
    .from('transactions')
    .update({
      stage: target,
      field_values: { ...(existing.field_values ?? {}), ...parsed.values },
      ...(parsed.address ? { property_address: parsed.address } : {}),
      ...mirroredColumns(parsed.values),
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('stage', existing.stage)
    .select(TX_COLUMNS)
    .maybeSingle()

  const action = target === 'post_closing' ? 'transaction.move_to_post_closing' : 'transaction.move_to_active'
  if (error || !data) {
    console.error('[transactions] stage move failed', { code: error?.code, message: error?.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action, recordId: id, status: 'failed', table: 'transactions' })
    return jsonError('Unable to move transaction.', error ? 500 : 409)
  }

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action, recordId: id, status: 'success', table: 'transactions' })
  return NextResponse.json({ transaction: mapTransaction(data) })
}