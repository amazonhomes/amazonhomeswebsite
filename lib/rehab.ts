import type { PurchaseMethod, RehabLevel } from '@/lib/types'

export const REHAB_LEVELS: { value: RehabLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

export function parseRehabLevel(v: unknown): RehabLevel | null {
  return v === 'light' || v === 'medium' || v === 'large' ? v : null
}

export function rehabLevelLabel(level: RehabLevel | null | undefined): string {
  return REHAB_LEVELS.find((l) => l.value === level)?.label ?? 'Not specified'
}

export const PURCHASE_METHODS: { value: PurchaseMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'financing', label: 'Financing' },
  { value: 'other', label: 'Other' },
]

export function parsePurchaseMethod(v: unknown): PurchaseMethod | null {
  return v === 'cash' || v === 'financing' || v === 'other' ? v : null
}

/** Human-readable purchase method, e.g. "Cash" or "Other: Seller carry". Null for legacy offers. */
export function purchaseMethodLabel(
  method: PurchaseMethod | null | undefined,
  other?: string | null,
): string | null {
  if (!method) return null
  if (method === 'other') return other?.trim() ? `Other: ${other.trim()}` : 'Other'
  return PURCHASE_METHODS.find((m) => m.value === method)?.label ?? null
}