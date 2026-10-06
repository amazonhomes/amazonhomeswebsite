'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DATE_CLOSED_FIELD_KEY, LIMITS, type Transaction } from '@/lib/transactions'
import { todayIso, txRequest } from '@/lib/transactions-client'

const TITLE_COMPANY_KEY = 'title_company'

/** Moves the same record between stages; values and documents are kept. */
export function MoveDialog({
  transaction,
  onClose,
  onMoved,
}: {
  transaction: Transaction
  onClose: () => void
  onMoved: (tx: Transaction) => void
}) {
  const toPost = transaction.stage === 'active'
  const closing = transaction.values.closing_info
  const closingDate = typeof closing === 'object' && closing?.date ? closing.date : ''
  const existingClosed = transaction.values[DATE_CLOSED_FIELD_KEY]
  const existingTitle = transaction.values[TITLE_COMPANY_KEY]

  const [dateClosed, setDateClosed] = useState(
    typeof existingClosed === 'string' && existingClosed ? existingClosed : closingDate || todayIso(),
  )
  const [titleCompany, setTitleCompany] = useState(typeof existingTitle === 'string' ? existingTitle : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await txRequest<{ transaction: Transaction }>(
      `/api/admin/transactions/${transaction.id}/stage`,
      'POST',
      {
        stage: toPost ? 'post_closing' : 'active',
        ...(toPost ? { values: { [DATE_CLOSED_FIELD_KEY]: dateClosed, [TITLE_COMPANY_KEY]: titleCompany } } : {}),
      },
    )
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(toPost ? 'Moved to Post-Closing' : 'Moved back to Active')
    onMoved(result.data.transaction)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{toPost ? 'Move to Post-Closing' : 'Move back to Active'}</DialogTitle>
            <DialogDescription>
              {`${transaction.propertyAddress} will move to ${toPost ? 'Post-Closing' : 'Active Transactions'}. All information and documents are kept.`}
            </DialogDescription>
          </DialogHeader>

          {toPost && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="move-date-closed">Date closed</Label>
                <Input
                  id="move-date-closed"
                  type="date"
                  value={dateClosed}
                  onChange={(e) => setDateClosed(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="move-title-company">Title company</Label>
                <Input
                  id="move-title-company"
                  maxLength={LIMITS.text}
                  value={titleCompany}
                  onChange={(e) => setTitleCompany(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {toPost ? 'Move to Post-Closing' : 'Move to Active'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Permanently deletes a transaction and its documents after confirmation. */
export function DeleteDialog({
  transaction,
  documentCount,
  onClose,
  onDeleted,
}: {
  transaction: Transaction
  documentCount: number
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    const result = await txRequest(`/api/admin/transactions/${transaction.id}`, 'DELETE')
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success('Transaction deleted')
    onDeleted(transaction.id)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete transaction?</DialogTitle>
          <DialogDescription>
            {`This permanently deletes ${transaction.propertyAddress}${
              documentCount > 0 ? ` and its ${documentCount} document${documentCount === 1 ? '' : 's'}` : ''
            }. This cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}