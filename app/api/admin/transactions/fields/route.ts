import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import {
  ADDRESS_FIELD_KEY,
  LIMITS,
  cleanText,
  isCustomFieldType,
  isStage,
  makeFieldKey,
  sanitizeLabel,
  sanitizeOptions,
} from '@/lib/transactions'
import { FIELD_COLUMNS, guardTransactions, isUuid, jsonError, loadFields, mapField, readJson } from '@/lib/transactions-server'

const MAX_FIELDS_PER_STAGE = 60

/**
 * POST /api/admin/transactions/fields — add a custom column. Only a field
 * definition row is created; values live in `transactions.field_values`, so no
 * schema migration is ever needed.
 */
export async function POST(req: Request) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const body = await readJson(req)
  if (!body) return jsonError('Invalid request.', 400)

  if (!isStage(body.stage)) return jsonError('Invalid tab.', 400)
  const label = sanitizeLabel(body.label)
  if (!label) return jsonError(`Column name must be 1–${LIMITS.label} characters.`, 400)
  if (!isCustomFieldType(body.fieldType)) return jsonError('Unsupported field type.', 400)

  let options: string[] = []
  if (body.fieldType === 'select') {
    const parsed = sanitizeOptions(body.options)
    if (!parsed || parsed.length === 0) return jsonError('Add at least one dropdown option.', 400)
    options = parsed
  }
  const helper = typeof body.helper === 'string' ? cleanText(body.helper).slice(0, LIMITS.helper) || null : null

  const existing = await loadFields(ctx.supabase, body.stage)
  if (!existing) return jsonError('Unable to load columns.', 500)
  if (existing.length >= MAX_FIELDS_PER_STAGE) return jsonError('This tab has the maximum number of columns.', 400)
  if (existing.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
    return jsonError('A column with that name already exists in this tab.', 409)
  }

  const position = existing.reduce((max, f) => Math.max(max, f.position), 0) + 1
  const { data, error } = await ctx.supabase
    .from('transaction_fields')
    .insert({
      stage: body.stage,
      key: makeFieldKey(label),
      label,
      field_type: body.fieldType,
      options,
      position,
      is_system: false,
      is_visible: true,
      helper,
    })
    .select(FIELD_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[transactions] add field failed', { code: error?.code, message: error?.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.create', recordId: null, status: 'failed', table: 'transaction_fields' })
    return jsonError('Unable to add column.', 500)
  }

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.create', recordId: data.id, status: 'success', table: 'transaction_fields' })
  return NextResponse.json({ field: mapField(data) }, { status: 201 })
}

/** PATCH /api/admin/transactions/fields — reorder a tab. Property Address stays first. */
export async function PATCH(req: Request) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response
  const body = await readJson(req)
  if (!body || !isStage(body.stage) || !Array.isArray(body.order) || !body.order.every(isUuid)) {
    return jsonError('Invalid request.', 400)
  }

  const fields = await loadFields(ctx.supabase, body.stage)
  if (!fields) return jsonError('Unable to load columns.', 500)
  const order = body.order as string[]
  const ids = new Set(fields.map((f) => f.id))
  if (order.length !== fields.length || new Set(order).size !== order.length || !order.every((id) => ids.has(id))) {
    return jsonError('Column list is out of date. Refresh and try again.', 409)
  }

  const address = fields.find((f) => f.key === ADDRESS_FIELD_KEY)
  const finalOrder = address ? [address.id, ...order.filter((id) => id !== address.id)] : order

  const results = await Promise.all(
    finalOrder.map((id, position) =>
      ctx.supabase
        .from('transaction_fields')
        .update({ position, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('stage', body.stage as string),
    ),
  )
  if (results.some((r) => r.error)) return jsonError('Unable to save column order.', 500)

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction_field.reorder', recordId: null, status: 'success', table: 'transaction_fields' })
  return NextResponse.json({ ok: true })
}