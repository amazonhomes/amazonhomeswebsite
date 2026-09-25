'use client'

import PhoneInputBase from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import { DEFAULT_COUNTRY } from '@/lib/phone'

type PhoneInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  required?: boolean
  invalid?: boolean
  placeholder?: string
  describedBy?: string
}

/**
 * Shared international phone field used by every form that collects a phone
 * number. Wraps react-phone-number-input (country selector with flag + calling
 * code, country-aware formatting, native-select accessibility) and emits the
 * value already normalized to E.164, so callers store/submit the canonical
 * value directly. Styling mirrors the shadcn `Input` (border, bg, focus ring,
 * radius, invalid state) so it reads as a native part of the UI.
 */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  required,
  invalid,
  placeholder = 'Enter phone number',
  describedBy,
}: PhoneInputProps) {
  return (
    <PhoneInputBase
      id={id}
      international
      defaultCountry={DEFAULT_COUNTRY}
      countryCallingCodeEditable={false}
      value={value || undefined}
      onChange={(v) => onChange(v ?? '')}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      numberInputProps={{
        required,
        'aria-invalid': invalid || undefined,
        'aria-describedby': describedBy,
      }}
      countrySelectProps={{ 'aria-label': 'Country' }}
      className={cn(
        'v0-phone',
        invalid && 'v0-phone--invalid',
        disabled && 'v0-phone--disabled',
      )}
    />
  )
}