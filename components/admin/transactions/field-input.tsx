'use client'

import { Checkbox } from '@/components/ui/check-box'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LIMITS, type DateLocation, type FieldValue, type TransactionField } from '@/lib/transactions'

const NONE = '__none__'

interface FieldInputProps {
  id: string
  field: TransactionField
  value: FieldValue
  onChange: (value: FieldValue) => void
  disabled?: boolean
}

/** Editable control for one transaction field, chosen by field type. */
export function FieldInput({ id, field, value, onChange, disabled }: FieldInputProps) {
  const describedBy = field.helper ? `${id}-help` : undefined

  switch (field.fieldType) {
    case 'checkbox':
      return (
        <label htmlFor={id} className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            id={id}
            checked={value === true}
            onCheckedChange={(v) => onChange(v === true)}
            disabled={disabled}
            aria-describedby={describedBy}
          />
          {field.helper ?? 'Yes'}
        </label>
      )
    case 'select': {
      const current = typeof value === 'string' && value ? value : NONE
      return (
        <Select value={current} onValueChange={(v) => onChange(!v || v === NONE ? '' : v)} disabled={disabled}>
          <SelectTrigger id={id} className="w-full" aria-describedby={describedBy}>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Not set</SelectItem>
            {field.options.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
            {typeof value === 'string' && value && !field.options.includes(value) && (
              <SelectItem value={value}>{`${value} (retired option)`}</SelectItem>
            )}
          </SelectContent>
        </Select>
      )
    }
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
        />
      )
    case 'link':
      return (
        <Input
          id={id}
          type="url"
          inputMode="url"
          placeholder="https://"
          maxLength={LIMITS.link}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
        />
      )
    case 'date_location': {
      const v: DateLocation = typeof value === 'object' && value ? value : { date: '', location: '' }
      return (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <Input
            id={id}
            type="date"
            aria-label={`${field.label} date`}
            value={v.date}
            onChange={(e) => onChange({ ...v, date: e.target.value })}
            disabled={disabled}
          />
          <Input
            aria-label={`${field.label} location`}
            placeholder="Location or title office"
            maxLength={LIMITS.location}
            value={v.location}
            onChange={(e) => onChange({ ...v, location: e.target.value })}
            disabled={disabled}
          />
        </div>
      )
    }
    case 'textarea':
    case 'file':
      return (
        <Textarea
          id={id}
          rows={field.fieldType === 'file' ? 2 : 3}
          placeholder={field.fieldType === 'file' ? 'Notes or links (optional)' : undefined}
          maxLength={LIMITS.textarea}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
        />
      )
    default:
      return (
        <Input
          id={id}
          maxLength={field.key === 'property_address' ? LIMITS.address : LIMITS.text}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-describedby={describedBy}
        />
      )
  }
}