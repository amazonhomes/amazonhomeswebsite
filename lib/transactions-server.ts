import 'server-only'
import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, type AdminContext } from '@/lib/admin-guard'
import { checkRateLimit, type LimiterName } from '@/lib/rate-limit'
import {
  ADDRESS_FIELD_KEY,
  DATE_CLOSED_FIELD_KEY,
  LIMITS,
  STATUS_FIELD_KEY,
  cleanText,
  validateFieldValue,
  type FieldValue,
  type Stage,
  type Transaction,
  type TransactionDocument,
  type TransactionField,
} from '@/lib/transactions'

export const DOCUMENT_BUCKET = 'transaction-documents'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

export const jsonError = (error: string, status: number) => NextResponse.json({ error }, { status })

type Guarded = { ctx: AdminContext; response?: undefined } | { ctx?: undefined; response: NextResponse }

/**
 * Admin + aal2 guard (re-derived from the session cookie) plus a per-admin
 * rate limit. All queries then run through the caller's cookie-bound client so
 * the `is_admin_aal2()` RLS policies apply as a second, independent check.
 */
export async function guardTransactions(limiter?: LimiterName): Promise<Guarded> {
  const guard = await requireAdmin()
  if (!guard.ok) return { response: jsonError(guard.error, guard.status) }
  if (limiter) {
    const rl = await checkRateLimit(limiter, guard.ctx.userId)
    if (!rl.success) return { response: jsonError('Too many requests. Please slow down.', 429) }
  }
  return { ctx: guard.ctx }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

type FieldRow = {
  id: string
  stage: Stage
  key: string
  label: string
  field_type: TransactionField['fieldType']
  options: unknown
  position: number
  is_system: boolean
  is_visible: boolean
  helper: string | null
}

export const FIELD_COLUMNS = 'id, stage, key, label, field_type, options, position, is_system, is_visible, helper'
export const TX_COLUMNS =
  'id, stage, property_address, transaction_status, field_values, closed_at, created_at, updated_at'
export const DOC_COLUMNS = 'id, transaction_id, field_key, original_filename, mime_type, file_size, created_at'

export function mapField(r: FieldRow): TransactionField {
  return {
    id: r.id,
    stage: r.stage,
    key: r.key,
    label: r.label,
    fieldType: r.field_type,
    options: Array.isArray(r.options) ? r.options.filter((o): o is string => typeof o === 'string') : [],
    position: r.position,
    isSystem: r.is_system,
    isVisible: r.is_visible,
    helper: r.helper,
  }
}

type TxRow = {
  id: string
  stage: Stage
  property_address: string
  transaction_status: string | null
  field_values: Record<string, FieldValue> | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export function mapTransaction(r: TxRow): Transaction {
  return {
    id: r.id,
    stage: r.stage,
    propertyAddress: r.property_address,
    status: r.transaction_status,
    values: { ...(r.field_values ?? {}), [ADDRESS_FIELD_KEY]: r.property_address },
    closedAt: r.closed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

type DocRow = {
  id: string
  transaction_id: string
  field_key: string
  original_filename: string
  mime_type: string
  file_size: number
  created_at: string
}

export function mapDocument(r: DocRow): TransactionDocument {
  return {
    id: r.id,
    transactionId: r.transaction_id,
    fieldKey: r.field_key,
    filename: r.original_filename,
    mimeType: r.mime_type,
    size: Number(r.file_size),
    createdAt: r.created_at,
  }
}

export async function loadFields(supabase: SupabaseClient, stage?: Stage): Promise<TransactionField[] | null> {
  let q = supabase.from('transaction_fields').select(FIELD_COLUMNS).order('position', { ascending: true })
  if (stage) q = q.eq('stage', stage)
  const { data, error } = await q
  if (error) {
    console.error('[transactions] load fields failed', { code: error.code, message: error.message })
    return null
  }
  return (data as FieldRow[]).map(mapField)
}

export type ValuesResult =
  | { ok: true; values: Record<string, FieldValue>; address?: string }
  | { ok: false; error: string }

/**
 * Validates a partial `values` object against the given field definitions.
 * Unknown keys and file fields' document lists are ignored (documents have
 * their own endpoints); file fields may carry free-text notes.
 */
export function validateValues(raw: unknown, fields: TransactionField[]): ValuesResult {
  if (raw === undefined) return { ok: true, values: {} }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Invalid values.' }
  const input = raw as Record<string, unknown>
  const byKey = new Map(fields.map((f) => [f.key, f]))
  const values: Record<string, FieldValue> = {}
  let address: string | undefined

  for (const [key, value] of Object.entries(input)) {
    const field = byKey.get(key)
    if (!field) continue
    if (key === ADDRESS_FIELD_KEY) {
      const v = typeof value === 'string' ? cleanText(value) : ''
      if (!v) return { ok: false, error: 'Property Address is required.' }
      if (v.length > LIMITS.address) return { ok: false, error: 'Property Address is too long.' }
      address = v
      continue
    }
    const effective = field.fieldType === 'file' ? { ...field, fieldType: 'textarea' as const } : field
    const result = validateFieldValue(effective, value)
    if (!result.ok) return result
    values[key] = result.value
  }
  return { ok: true, values, address }
}

/** Columns mirrored out of `field_values` for indexing, filtering and sorting. */
export function mirroredColumns(values: Record<string, FieldValue>) {
  const out: { transaction_status?: string | null; closed_at?: string | null } = {}
  if (STATUS_FIELD_KEY in values) {
    const s = values[STATUS_FIELD_KEY]
    out.transaction_status = typeof s === 'string' && s ? s : null
  }
  if (DATE_CLOSED_FIELD_KEY in values) {
    const d = values[DATE_CLOSED_FIELD_KEY]
    out.closed_at = typeof d === 'string' && d ? d : null
  }
  return out
}

/** Best-effort removal of storage objects; failures are logged, never thrown. */
export async function removeObjects(supabase: SupabaseClient, paths: string[]) {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(DOCUMENT_BUCKET).remove(paths)
  if (error) console.error('[transactions] storage remove failed', { message: error.message, count: paths.length })
}