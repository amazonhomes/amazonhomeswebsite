import type { FieldValue, TransactionField, TransactionsPayload } from '@/lib/transactions'

export const TRANSACTIONS_KEY = '/api/admin/transactions'

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

export async function txRequest<T = Record<string, unknown>>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown> | FormData,
): Promise<ApiResult<T>> {
  try {
    const isForm = body instanceof FormData
    const res = await fetch(url, {
      method,
      headers: body && !isForm ? { 'content-type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    })
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    if (!res.ok) return { ok: false, error: data.error ?? `Request failed (${res.status}). Please try again.` }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'Network error. Please try again.' }
  }
}

export async function fetchTransactions(url: string): Promise<TransactionsPayload> {
  const result = await txRequest<TransactionsPayload>(url, 'GET')
  if (!result.ok) throw new Error(result.error)
  return result.data
}

/** Default (empty) value for a field, used when a record has no stored value. */
export function emptyValue(field: TransactionField): FieldValue {
  if (field.fieldType === 'checkbox') return false
  if (field.fieldType === 'date_location') return { date: '', location: '' }
  return ''
}

/** Formats a stored YYYY-MM-DD date without a timezone shift. */
export function formatPlainDate(v: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const [y, m, d] = v.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayIso(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
