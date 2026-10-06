import { NextResponse } from 'next/server'
import { writeAudit } from '@/lib/admin-guard'
import {
  DOC_COLUMNS,
  TX_COLUMNS,
  guardTransactions,
  jsonError,
  loadFields,
  mapDocument,
  mapTransaction,
  mirroredColumns,
  readJson,
  validateValues,
} from '@/lib/transactions-server'

const MAX_ROWS = 2000

/** GET /api/admin/transactions — field definitions, transactions and document metadata. */
export async function GET() {
  const { ctx, response } = await guardTransactions()
  if (response) return response

  const [fields, txRes, docRes] = await Promise.all([
    loadFields(ctx.supabase),
    ctx.supabase.from('transactions').select(TX_COLUMNS).order('created_at', { ascending: false }).limit(MAX_ROWS),
    ctx.supabase.from('transaction_documents').select(DOC_COLUMNS).order('created_at', { ascending: true }),
  ])

  if (!fields || txRes.error || docRes.error) {
    console.error('[transactions] load failed', { tx: txRes.error?.message, docs: docRes.error?.message })
    return jsonError('Unable to load transactions.', 500)
  }

  return NextResponse.json(
    {
      fields,
      transactions: (txRes.data ?? []).map(mapTransaction),
      documents: (docRes.data ?? []).map(mapDocument),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}

/** POST /api/admin/transactions — create an Active transaction. */
export async function POST(req: Request) {
  const { ctx, response } = await guardTransactions('adminTransactions')
  if (response) return response

  const body = await readJson(req)
  if (!body) return jsonError('Invalid request.', 400)

  const fields = await loadFields(ctx.supabase, 'active')
  if (!fields) return jsonError('Unable to load columns.', 500)

  const parsed = validateValues(body.values, fields)
  if (!parsed.ok) return jsonError(parsed.error, 400)
  if (!parsed.address) return jsonError('Property Address is required.', 400)

  const { data, error } = await ctx.supabase
    .from('transactions')
    .insert({
      stage: 'active',
      property_address: parsed.address,
      field_values: parsed.values,
      ...mirroredColumns(parsed.values),
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select(TX_COLUMNS)
    .single()

  if (error || !data) {
    console.error('[transactions] create failed', { code: error?.code, message: error?.message })
    await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.create', recordId: null, status: 'failed', table: 'transactions' })
    return jsonError('Unable to create transaction.', 500)
  }

  await writeAudit({ actorId: ctx.userId, actorRole: ctx.role, action: 'transaction.create', recordId: data.id, status: 'success', table: 'transactions' })
  return NextResponse.json({ transaction: mapTransaction(data) }, { status: 201 })
}