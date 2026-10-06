'use client'

import { useMemo, useState } from 'react'
import { ArrowLeftRight, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DocumentsField } from '@/components/admin/transactions/documents-field'
import { FieldInput } from '@/components/admin/transactions/field-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDateTime } from '@/lib/format'
import {
  ADDRESS_FIELD_KEY,
  type FieldValue,
  type Transaction,
  type TransactionDocument,
  type TransactionField,
} from '@/lib/transactions'
import { emptyValue, txRequest } from '@/lib/transactions-client'

interface TransactionDialogProps {
  /** `null` creates a new Active transaction. */
  transaction: Transaction | null
  fields: TransactionField[]
  documents: TransactionDocument[]
  onClose: () => void
  onSaved: (tx: Transaction, created: boolean) => void
  onDocumentsChanged: () => void
  onMove: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

function initialValues(fields: TransactionField[], tx: Transaction | null): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {}
  for (const f of fields) out[f.key] = tx?.values[f.key] ?? emptyValue(f)
  return out
}

/** Create/edit form. Mounted per record (keyed by id) so state resets on open. */
export function TransactionDialog({
  transaction,
  fields,
  documents,
  onClose,
  onSaved,
  onDocumentsChanged,
  onMove,
  onDelete,
}: TransactionDialogProps) {
  const isNew = transaction === null
  const [values, setValues] = useState(() => initialValues(fields, transaction))
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialValues(fields, transaction)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const dirty = JSON.stringify(values) !== baseline
  const docsByField = useMemo(() => {
    const map = new Map<string, TransactionDocument[]>()
    for (const d of documents) map.set(d.fieldKey, [...(map.get(d.fieldKey) ?? []), d])
    return map
  }, [documents])

  const requestClose = () => {
    if (dirty && !saving) setConfirmDiscard(true)
    else onClose()
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const address = values[ADDRESS_FIELD_KEY]
    if (typeof address !== 'string' || !address.trim()) {
      setError('Property Address is required.')
      return
    }
    setSaving(true)
    setError(null)
    const result = isNew
      ? await txRequest<{ transaction: Transaction }>('/api/admin/transactions', 'POST', { values })
      : await txRequest<{ transaction: Transaction }>(`/api/admin/transactions/${transaction.id}`, 'PATCH', { values })
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setBaseline(JSON.stringify(values))
    toast.success(isNew ? 'Transaction created' : 'Changes saved')
    onSaved(result.data.transaction, isNew)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && requestClose()}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{isNew ? 'New transaction' : transaction.propertyAddress}</DialogTitle>
          <DialogDescription>
            {isNew
              ? 'Add the deal details. You can attach documents after it is created.'
              : `Created ${formatDateTime(transaction.createdAt)} · Updated ${formatDateTime(transaction.updatedAt)}`}
          </DialogDescription>
        </DialogHeader>

        <form id="transaction-form" onSubmit={save} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">
            {fields.map((field) => {
              const id = `tx-${field.key}`
              const isAddress = field.key === ADDRESS_FIELD_KEY
              return (
                <div key={field.id} className="flex flex-col gap-1.5">
                  {field.fieldType !== 'checkbox' || !field.helper ? (
                    <Label htmlFor={id} className="text-sm font-medium">
                      {field.label}
                      {isAddress && <span className="text-destructive"> *</span>}
                    </Label>
                  ) : (
                    <span className="text-sm font-medium text-foreground">{field.label}</span>
                  )}
                  {field.helper && field.fieldType !== 'checkbox' && (
                    <p id={`${id}-help`} className="text-xs text-muted-foreground">
                      {field.helper}
                    </p>
                  )}
                  {field.fieldType === 'file' && (
                    isNew ? (
                      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        Save the transaction first to upload documents.
                      </p>
                    ) : (
                      <DocumentsField
                        transactionId={transaction.id}
                        field={field}
                        documents={docsByField.get(field.key) ?? []}
                        onChanged={onDocumentsChanged}
                      />
                    )
                  )}
                  <FieldInput
                    id={id}
                    field={field}
                    value={values[field.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
                    disabled={saving}
                  />
                </div>
              )
            })}
          </div>
        </form>

        {error && (
          <p role="alert" className="border-t border-destructive/20 bg-destructive/5 px-6 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {confirmDiscard ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/50 px-6 py-3">
            <p className="text-sm text-foreground">Discard unsaved changes?</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button type="button" variant="destructive" onClick={onClose}>
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter className="flex-row flex-wrap items-center gap-2 border-t border-border px-6 py-3 sm:justify-between">
            {!isNew ? (
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(transaction)} disabled={saving}>
                  <Trash2 className="size-4 text-destructive" />
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={saving}
                  onClick={() => (dirty ? setError('Save or discard your changes before moving.') : onMove(transaction))}
                >
                  <ArrowLeftRight className="size-4" />
                  {transaction.stage === 'active' ? 'Move to Post-Closing' : 'Move back to Active'}
                </Button>
              </div>
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={requestClose} disabled={saving}>
                {isNew || dirty ? 'Cancel' : 'Close'}
              </Button>
              <Button type="submit" form="transaction-form" disabled={saving || (!isNew && !dirty)}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {isNew ? 'Create transaction' : 'Save changes'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}