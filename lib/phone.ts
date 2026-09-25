import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

/**
 * Single source of truth for phone parsing/validation/normalization, shared by
 * the client `PhoneInput` component and every server route that accepts a phone
 * number. Backed by libphonenumber-js so validation is country-aware — obviously
 * invalid numbers (e.g. `12345678`, `123`, `000000`) are rejected for the
 * selected country rather than passing a naive regex.
 */

/** Amazon Homes operates primarily in Metro Detroit, so new empty fields
 *  default to the United States. Users can still pick any other country. */
export const DEFAULT_COUNTRY: CountryCode = 'US'

export const PHONE_REQUIRED_ERROR = 'Phone number is required.'
export const PHONE_INVALID_ERROR = 'Please enter a valid phone number.'

/** True only when `value` is a valid number for its country. Accepts E.164
 *  (the shape the client component emits) or a national number parsed against
 *  `country`. */
export function isValidPhone(value: string, country: CountryCode = DEFAULT_COUNTRY): boolean {
  if (!value) return false
  const parsed = parsePhoneNumberFromString(value, country)
  return !!parsed && parsed.isValid()
}

/** Parse + validate, returning the canonical E.164 string (e.g. `+13135551234`)
 *  or null when the number is not valid. No formatting characters are ever
 *  persisted — E.164 is the canonical stored/transmitted value. */
export function normalizeToE164(
  value: unknown,
  country: CountryCode = DEFAULT_COUNTRY,
): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parsePhoneNumberFromString(trimmed, country)
  if (!parsed || !parsed.isValid()) return null
  return parsed.number
}

export type PhoneValidation = { ok: true; value: string } | { ok: false; error: string }

/**
 * Field-level validation honoring required/optional semantics. Used identically
 * on the client (before submit) and the server (before persistence):
 *   - empty + required  -> error "Phone number is required."
 *   - empty + optional  -> ok with "" (nothing stored)
 *   - present + invalid -> error "Please enter a valid phone number."
 *   - present + valid   -> ok with the E.164 value
 */
export function validatePhoneField(
  value: unknown,
  { required }: { required: boolean },
): PhoneValidation {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) {
    return required ? { ok: false, error: PHONE_REQUIRED_ERROR } : { ok: true, value: '' }
  }
  const e164 = normalizeToE164(raw)
  if (!e164) return { ok: false, error: PHONE_INVALID_ERROR }
  return { ok: true, value: e164 }
}

/**
 * Best-effort coercion of a stored/legacy value to E.164 for display in an edit
 * field. Returns "" when the value can't be safely parsed, so we never guess a
 * wrong country — the user simply re-enters it. Historical records are only ever
 * rewritten when a user actually edits and submits the form.
 */
export function coerceInitialPhone(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''
  return normalizeToE164(value.trim()) ?? ''
}