import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import {
  TX_COLUMNS,
  guardTransactions,
  isUuid,
  jsonError,
  loadFields,
  mapTransaction,
  mirroredColumns,
  readJson,
  removeObjects,
  validateValues,
} from '@/lib/transactions-server'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/transactions/[id] — save edited values. Values are
 * validated against every field definition (both stages share keys) and
 * merged into the stored object, so hidden or other-stage values are kept.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Transaction not found.', 404)

  const body = await readJson(req)
  if (!body) return jsonError('Invalid request.', 400)

  const fields = await loadFields(ctx.supabase)
  if (!fields) return jsonError('Unable to load columns.', 500)
  const parsed = validateValues(body.values, fields)
  if (!parsed.ok) return jsonError(parsed.error, 400)

  const { data: existing, error: loadError } = await ctx.supabase
    .from('transactions')
    .select('field_values')
    .eq('id', id)
    .maybeSingle()
  if (loadError) return jsonError('Unable to load transaction.', 500)
  if (!existing) return jsonError('Transaction not found.', 404)

  const merged = { ...(existing.field_values ?? {}), ...parsed.values }
  const { data, error } = await ctx.supabase
    .from('transactions')
    .update({
      field_values: merged,
      ...(parsed.address ? { property_address: parsed.address } : {}),
      ...mirroredColumns(parsed.values),
      updated_by: ctx.userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(TX_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[transactions] update failed', { code: error?.code, message: error?.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.update', recordId: id, status: 'failed', table: 'transactions' })
    return jsonError('Unable to save changes.', 500)
  }

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.update', recordId: id, status: 'success', table: 'transactions' })
  return NextResponse.json({ transaction: mapTransaction(data) })
}

/** DELETE /api/admin/transactions/[id] — delete the transaction, its document rows and files. */
export async function DELETE(_req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Transaction not found.', 404)

  const { data: docs, error: docsError } = await ctx.supabase
    .from('transaction_documents')
    .select('storage_path')
    .eq('transaction_id', id)
  if (docsError) return jsonError('Unable to delete transaction.', 500)

  const { data, error } = await ctx.supabase.from('transactions').delete().eq('id', id).select('id')
  if (error) {
    console.error('[transactions] delete failed', { code: error.code, message: error.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.delete', recordId: id, status: 'failed', table: 'transactions' })
    return jsonError('Unable to delete transaction.', 500)
  }
  if (!data || data.length === 0) return jsonError('Transaction not found.', 404)

  await removeObjects(ctx.supabase, (docs ?? []).map((d) => d.storage_path as string))
  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.delete', recordId: id, status: 'success', table: 'transactions' })
  return NextResponse.json({ ok: true })
}