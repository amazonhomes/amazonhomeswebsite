/**
 * Shared Transaction Coordinator types and validation. Safe for both the
 * browser (form rendering) and the server (authoritative validation).
 */

export const STAGES = ['active', 'post_closing'] as const
export type Stage = (typeof STAGES)[number]

export const FIELD_TYPES = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'date',
  'link',
  'file',
  'date_location',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

/** Types an admin may pick when adding a column. `date_location` is system-only. */
export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'select',
  'checkbox',
  'date',
  'link',
  'file',
] as const satisfies readonly FieldType[]
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long text',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  date: 'Date',
  link: 'Link',
  file: 'File / Document',
  date_location: 'Date & location',
}

/** Fields the application depends on: they can be renamed but never hidden or removed. */
export const CORE_FIELD_KEYS = ['property_address', 'property_status', 'date_closed'] as const

export const STATUS_FIELD_KEY = 'property_status'
export const ADDRESS_FIELD_KEY = 'property_address'
export const DATE_CLOSED_FIELD_KEY = 'date_closed'

export const STAGE_LABELS: Record<Stage, string> = {
  active: 'Active Transactions',
  post_closing: 'Post-Closing',
}

export type DateLocation = { date: string; location: string }
export type FieldValue = string | boolean | DateLocation

export type TransactionField = {
  id: string
  stage: Stage
  key: string
  label: string
  fieldType: FieldType
  options: string[]
  position: number
  isSystem: boolean
  isVisible: boolean
  helper: string | null
}

export type TransactionDocument = {
  id: string
  transactionId: string
  fieldKey: string
  filename: string
  mimeType: string
  size: number
  createdAt: string
}

export type Transaction = {
  id: string
  stage: Stage
  propertyAddress: string
  status: string | null
  /** Every stored value, including `property_address`, keyed by field key. */
  values: Record<string, FieldValue>
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TransactionsPayload = {
  fields: TransactionField[]
  transactions: Transaction[]
  documents: TransactionDocument[]
}

export const MAX_DOC_BYTES = 15 * 1024 * 1024
export const ALLOWED_DOC_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
export const DOC_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

export const LIMITS = {
  label: 80,
  helper: 160,
  text: 500,
  textarea: 5000,
  link: 2000,
  location: 300,
  address: 300,
  option: 60,
  options: 30,
} as const

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isStage(v: unknown): v is Stage {
  return typeof v === 'string' && (STAGES as readonly string[]).includes(v)
}

export function isCustomFieldType(v: unknown): v is CustomFieldType {
  return typeof v === 'string' && (CUSTOM_FIELD_TYPES as readonly string[]).includes(v)
}

export function isCoreField(key: string): boolean {
  return (CORE_FIELD_KEYS as readonly string[]).includes(key)
}

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v)
}

function isSafeUrl(v: string): boolean {
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Strips control characters (keeping newlines/tabs) and trims. */
export function cleanText(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
}

export type ValueResult = { ok: true; value: FieldValue } | { ok: false; error: string }

/** Validates and normalizes one submitted value against its field definition. */
export function validateFieldValue(field: TransactionField, raw: unknown): ValueResult {
  const fail = (error: string): ValueResult => ({ ok: false, error: `${field.label}: ${error}` })
  switch (field.fieldType) {
    case 'checkbox':
      if (typeof raw !== 'boolean') return fail('must be checked or unchecked.')
      return { ok: true, value: raw }
    case 'date_location': {
      if (!raw || typeof raw !== 'object') return fail('is invalid.')
      const r = raw as Record<string, unknown>
      const date = typeof r.date === 'string' ? r.date.trim() : ''
      const location = typeof r.location === 'string' ? cleanText(r.location) : ''
      if (date && !isValidDate(date)) return fail('date is invalid.')
      if (location.length > LIMITS.location) return fail(`location must be ${LIMITS.location} characters or fewer.`)
      return { ok: true, value: { date, location } }
    }
    default: {
      if (typeof raw !== 'string') return fail('is invalid.')
      const v = cleanText(raw)
      if (field.fieldType === 'date') {
        if (v && !isValidDate(v)) return fail('must be a valid date.')
      } else if (field.fieldType === 'select') {
        if (v && !field.options.includes(v)) return fail('is not one of the configured options.')
      } else if (field.fieldType === 'link') {
        if (v.length > LIMITS.link) return fail('is too long.')
        if (v && !isSafeUrl(v)) return fail('must be a full http(s) link.')
      } else {
        const max = field.fieldType === 'text' ? LIMITS.text : LIMITS.textarea
        if (v.length > max) return fail(`must be ${max} characters or fewer.`)
      }
      return { ok: true, value: v }
    }
  }
}

/** Normalizes a dropdown option list: trimmed, de-duplicated, bounded. */
export function sanitizeOptions(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') return null
    const v = cleanText(item)
    if (!v) continue
    if (v.length > LIMITS.option) return null
    if (!out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v)
  }
  if (out.length > LIMITS.options) return null
  return out
}

export function sanitizeLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = cleanText(raw).replace(/\s+/g, ' ')
  return v.length >= 1 && v.length <= LIMITS.label ? v : null
}

/** Stable storage key for a new custom column. The random suffix keeps keys
 *  unique across both stages, so values never collide after a stage move. */
export function makeFieldKey(label: string): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field'
  const base = /^[a-z]/.test(slug) ? slug : `f_${slug}`
  const suffix = Math.random().toString(36).slice(2, 7).padEnd(5, '0')
  return `${base}_${suffix}`
}

export function isEmptyValue(v: FieldValue | undefined): boolean {
  if (v === undefined || v === '' || v === false) return true
  if (typeof v === 'object') return !v.date && !v.location
  return false
}

/** Plain-text representation used for search and compact display. */
export function valueText(v: FieldValue | undefined): string {
  if (v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : ''
  if (typeof v === 'object') return [v.date, v.location].filter(Boolean).join(' ')
  return v
}

export type StatusTone = 'positive' | 'danger' | 'warning' | 'info' | 'neutral'

/** Tone for known statuses; unknown/future options fall back to neutral. */
export function statusTone(status: string | null | undefined): StatusTone {
  const s = (status ?? '').toLowerCase()
  if (!s) return 'neutral'
  if (s.includes('red') || s.includes('cancel') || s.includes('dead')) return 'danger'
  if (s.includes('clear') || s.includes('ready') || s.includes('closed')) return 'positive'
  if (s.includes('pending') || s.includes('hold')) return 'warning'
  if (s.includes('working') || s.includes('progress')) return 'info'
  return 'neutral'
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}