'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ADDRESS_FIELD_KEY,
  CUSTOM_FIELD_TYPES,
  FIELD_TYPE_LABELS,
  LIMITS,
  STAGE_LABELS,
  isCoreField,
  type CustomFieldType,
  type Stage,
  type TransactionField,
} from '@/lib/transactions'
import { txRequest } from '@/lib/transactions-client'

const parseOptions = (text: string) =>
  text
    .split(/\n|,/)
    .map((o) => o.trim())
    .filter(Boolean)

interface ColumnsDialogProps {
  stage: Stage
  fields: TransactionField[]
  onClose: () => void
  onChanged: () => Promise<unknown>
}

/** Add, rename, reorder, hide/show and remove columns for one tab. */
export function ColumnsDialog({ stage, fields, onClose, onChanged }: ColumnsDialogProps) {
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) => {
    setBusy(key)
    const result = await fn()
    if (result.ok) {
      await onChanged()
      if (success) toast.success(success)
    } else {
      toast.error(result.error ?? 'Something went wrong.')
    }
    setBusy(null)
    return result.ok
  }

  const move = (index: number, delta: -1 | 1) => {
    const order = fields.map((f) => f.id)
    const target = index + delta
    ;[order[index], order[target]] = [order[target], order[index]]
    return run('reorder', () => txRequest('/api/admin/transactions/fields', 'PATCH', { stage, order }))
  }

  const toggleVisible = (field: TransactionField) =>
    run(field.id, () =>
      txRequest(`/api/admin/transactions/fields/${field.id}`, 'PATCH', { isVisible: !field.isVisible }),
    )

  const remove = async (field: TransactionField) => {
    const ok = await run(
      field.id,
      () => txRequest(`/api/admin/transactions/fields/${field.id}`, 'DELETE'),
      `Removed “${field.label}”`,
    )
    if (ok) setConfirmRemove(null)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>Manage columns</DialogTitle>
          <DialogDescription>{`Columns for ${STAGE_LABELS[stage]}. Changes apply to every transaction in this tab.`}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {fields.map((field, index) => {
              const locked = field.key === ADDRESS_FIELD_KEY
              const core = isCoreField(field.key)
              const rowBusy = busy === field.id
              return (
                <li key={field.id} className="flex flex-col gap-3 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-6"
                        aria-label={`Move ${field.label} up`}
                        disabled={busy !== null || locked || index <= 1}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        className="size-6"
                        aria-label={`Move ${field.label} down`}
                        disabled={busy !== null || locked || index === fields.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${field.isVisible ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {field.label}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.fieldType]}</span>
                        {core && (
                          <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                            <Lock className="size-2.5" aria-hidden="true" />
                            Required
                          </Badge>
                        )}
                        {!field.isSystem && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                    {rowBusy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Edit ${field.label}`}
                      aria-expanded={editing === field.id}
                      disabled={busy !== null}
                      onClick={() => setEditing(editing === field.id ? null : field.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={field.isVisible ? `Hide ${field.label}` : `Show ${field.label}`}
                      title={core ? 'Required columns cannot be hidden' : undefined}
                      disabled={busy !== null || core}
                      onClick={() => toggleVisible(field)}
                    >
                      {field.isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    {!field.isSystem && (
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${field.label}`}
                        disabled={busy !== null}
                        onClick={() => setConfirmRemove(field.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {confirmRemove === field.id && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                      <p className="text-xs text-destructive">
                        {`Remove “${field.label}”? Its values and documents are deleted from every transaction.`}
                      </p>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(null)} disabled={rowBusy}>
                          Keep
                        </Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => remove(field)} disabled={rowBusy}>
                          Remove column
                        </Button>
                      </div>
                    </div>
                  )}

                  {editing === field.id && (
                    <EditFieldForm
                      field={field}
                      busy={rowBusy}
                      onCancel={() => setEditing(null)}
                      onSave={async (patch) => {
                        const ok = await run(
                          field.id,
                          () => txRequest(`/api/admin/transactions/fields/${field.id}`, 'PATCH', patch),
                          'Column updated',
                        )
                        if (ok) setEditing(null)
                      }}
                    />
                  )}
                </li>
              )
            })}
          </ul>

          <AddFieldForm
            disabled={busy !== null}
            onAdd={(payload) =>
              run('add', () => txRequest('/api/admin/transactions/fields', 'POST', { stage, ...payload }), `Added “${payload.label}”`)
            }
            busy={busy === 'add'}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditFieldForm({
  field,
  busy,
  onCancel,
  onSave,
}: {
  field: TransactionField
  busy: boolean
  onCancel: () => void
  onSave: (patch: Record<string, unknown>) => void
}) {
  const [label, setLabel] = useState(field.label)
  const [helper, setHelper] = useState(field.helper ?? '')
  const [options, setOptions] = useState(field.options.join('\n'))

  return (
    <form
      className="flex flex-col gap-3 rounded-md bg-secondary/50 p-3"
      onSubmit={(e) => {
        e.preventDefault()
        const patch: Record<string, unknown> = { label, helper }
        if (field.fieldType === 'select') patch.options = parseOptions(options)
        onSave(patch)
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit-label-${field.id}`}>Column name</Label>
        <Input id={`edit-label-${field.id}`} value={label} maxLength={LIMITS.label} onChange={(e) => setLabel(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`edit-helper-${field.id}`}>Helper text</Label>
        <Input id={`edit-helper-${field.id}`} value={helper} maxLength={LIMITS.helper} onChange={(e) => setHelper(e.target.value)} />
      </div>
      {field.fieldType === 'select' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`edit-options-${field.id}`}>Dropdown options</Label>
          <Textarea id={`edit-options-${field.id}`} rows={5} value={options} onChange={(e) => setOptions(e.target.value)} />
          <p className="text-xs text-muted-foreground">One per line. Records using a removed option keep their value.</p>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          Save column
        </Button>
      </div>
    </form>
  )
}

function AddFieldForm({
  disabled,
  busy,
  onAdd,
}: {
  disabled: boolean
  busy: boolean
  onAdd: (payload: { label: string; fieldType: CustomFieldType; options: string[]; helper: string }) => Promise<boolean>
}) {
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState('')
  const [helper, setHelper] = useState('')

  return (
    <form
      className="mt-5 flex flex-col gap-3 rounded-lg border border-dashed border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const ok = await onAdd({ label: label.trim(), fieldType, options: parseOptions(options), helper })
        if (ok) {
          setLabel('')
          setOptions('')
          setHelper('')
          setFieldType('text')
        }
      }}
    >
      <p className="text-sm font-semibold text-foreground">Add a column</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-col-label">Column name</Label>
          <Input id="new-col-label" value={label} maxLength={LIMITS.label} onChange={(e) => setLabel(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-col-type">Field type</Label>
          <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
            <SelectTrigger id="new-col-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CUSTOM_FIELD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {FIELD_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {fieldType === 'select' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-col-options">Dropdown options</Label>
          <Textarea id="new-col-options" rows={3} placeholder={'One per line'} value={options} onChange={(e) => setOptions(e.target.value)} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-col-helper">Helper text (optional)</Label>
        <Input id="new-col-helper" value={helper} maxLength={LIMITS.helper} onChange={(e) => setHelper(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={disabled || !label.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add column
        </Button>
      </div>
    </form>
  )
}