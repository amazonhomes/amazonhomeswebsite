import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import { LIMITS, cleanText, isCoreField, sanitizeLabel, sanitizeOptions } from '@/lib/transactions'
import {
  FIELD_COLUMNS,
  guardTransactions,
  isUuid,
  jsonError,
  mapField,
  readJson,
  removeObjects,
} from '@/lib/transactions-server'

type Params = { params: Promise<{ id: string }> }

/**
 * PATCH /api/admin/transactions/fields/[id] — rename, configure dropdown
 * options, edit helper text, or hide/show. Field type and key never change
 * (that would orphan stored values). Core fields cannot be hidden.
 */
export async function PATCH(req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Column not found.', 404)
  const body = await readJson(req)
  if (!body) return jsonError('Invalid request.', 400)

  const { data: row, error: loadError } = await ctx.supabase
    .from('transaction_fields')
    .select(FIELD_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (loadError) return jsonError('Unable to load column.', 500)
  if (!row) return jsonError('Column not found.', 404)
  const field = mapField(row)

  const update: Record<string, unknown> = {}
  if (body.label !== undefined) {
    const label = sanitizeLabel(body.label)
    if (!label) return jsonError(`Column name must be 1–${LIMITS.label} characters.`, 400)
    if (label.toLowerCase() !== field.label.toLowerCase()) {
      const { data: clash } = await ctx.supabase
        .from('transaction_fields')
        .select('id')
        .eq('stage', field.stage)
        .ilike('label', label.replace(/[%_\\]/g, '\\$&'))
        .neq('id', id)
        .limit(1)
      if (clash && clash.length > 0) return jsonError('A column with that name already exists in this tab.', 409)
    }
    update.label = label
  }
  if (body.options !== undefined) {
    if (field.fieldType !== 'select') return jsonError('Only dropdown columns have options.', 400)
    const options = sanitizeOptions(body.options)
    if (!options || options.length === 0) return jsonError('Add at least one dropdown option.', 400)
    update.options = options
  }
  if (body.isVisible !== undefined) {
    if (typeof body.isVisible !== 'boolean') return jsonError('Invalid visibility.', 400)
    if (!body.isVisible && isCoreField(field.key)) return jsonError(`${field.label} is required and cannot be hidden.`, 400)
    update.is_visible = body.isVisible
  }
  if (body.helper !== undefined) {
    update.helper = typeof body.helper === 'string' ? cleanText(body.helper).slice(0, LIMITS.helper) || null : null
  }
  if (Object.keys(update).length === 0) return jsonError('Nothing to update.', 400)
  update.updated_at = new Date().toISOString()

  const { data, error } = await ctx.supabase
    .from('transaction_fields')
    .update(update)
    .eq('id', id)
    .select(FIELD_COLUMNS)
    .single()
  if (error || !data) {
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.update', recordId: id, status: 'failed', table: 'transaction_fields' })
    return jsonError('Unable to update column.', 500)
  }

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.update', recordId: id, status: 'success', table: 'transaction_fields' })
  return NextResponse.json({ field: mapField(data) })
}

/**
 * DELETE /api/admin/transactions/fields/[id] — remove a CUSTOM column. The
 * `transaction_remove_field` function strips its values and document rows and
 * refuses system fields; the stored files are removed afterwards.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const { id } = await params
  if (!isUuid(id)) return jsonError('Column not found.', 404)

  const { data: row } = await ctx.supabase
    .from('transaction_fields')
    .select('key, is_system')
    .eq('id', id)
    .maybeSingle()
  if (!row) return jsonError('Column not found.', 404)
  if (row.is_system) return jsonError('Default columns cannot be removed. Hide it instead.', 400)

  const { data: docs } = await ctx.supabase
    .from('transaction_documents')
    .select('storage_path')
    .eq('field_key', row.key)

  const { data: affected, error } = await ctx.supabase.rpc('transaction_remove_field', { p_field_id: id })
  if (error) {
    console.error('[transactions] remove field failed', { code: error.code, message: error.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.delete', recordId: id, status: 'failed', table: 'transaction_fields' })
    return jsonError('Unable to remove column.', 500)
  }

  await removeObjects(ctx.supabase, (docs ?? []).map((d) => d.storage_path as string))
  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.delete', recordId: id, status: 'success', table: 'transaction_fields' })
  return NextResponse.json({ ok: true, affected: typeof affected === 'number' ? affected : 0 })
}