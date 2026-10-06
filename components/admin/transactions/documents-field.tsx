'use client'

import { useRef, useState } from 'react'
import { Download, Eye, FileText, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  ALLOWED_DOC_TYPES,
  DOC_ACCEPT,
  MAX_DOC_BYTES,
  formatBytes,
  type TransactionDocument,
  type TransactionField,
} from '@/lib/transactions'
import { txRequest } from '@/lib/transactions-client'

interface DocumentsFieldProps {
  transactionId: string
  field: TransactionField
  documents: TransactionDocument[]
  onChanged: () => void
}

function checkFile(file: File): string | null {
  if (!ALLOWED_DOC_TYPES[file.type]) return 'Only PDF, JPG, PNG or WEBP files are allowed.'
  if (file.size <= 0) return 'The file is empty.'
  if (file.size > MAX_DOC_BYTES) return 'File is larger than 15 MB.'
  return null
}

/** Upload, view, download, replace and remove private documents for one field. */
export function DocumentsField({ transactionId, field, documents, onChanged }: DocumentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const pick = (replaceId: string | null) => {
    replaceTarget.current = replaceId
    inputRef.current?.click()
  }

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (list.length === 0) return
    const replaceId = replaceTarget.current
    const batch = replaceId ? list.slice(0, 1) : list

    for (const file of batch) {
      const problem = checkFile(file)
      if (problem) {
        toast.error(`${file.name}: ${problem}`)
        continue
      }
      setBusy(replaceId ?? 'upload')
      const form = new FormData()
      form.set('file', file)
      form.set('fieldKey', field.key)
      if (replaceId) form.set('replaceId', replaceId)
      const result = await txRequest(`/api/admin/transactions/${transactionId}/documents`, 'POST', form)
      if (result.ok) toast.success(replaceId ? `Replaced with ${file.name}` : `Uploaded ${file.name}`)
      else toast.error(result.error)
    }
    setBusy(null)
    onChanged()
  }

  const open = async (doc: TransactionDocument, download: boolean) => {
    // Opened synchronously so popup blockers allow it; the signed URL is filled in after.
    const win = download ? null : window.open('about:blank', '_blank')
    setBusy(doc.id)
    const result = await txRequest<{ url: string }>(
      `/api/admin/transactions/documents/${doc.id}${download ? '?download=1' : ''}`,
      'GET',
    )
    setBusy(null)
    if (!result.ok) {
      win?.close()
      toast.error(result.error)
      return
    }
    if (win) {
      win.opener = null
      win.location.href = result.data.url
    } else {
      const a = document.createElement('a')
      a.href = result.data.url
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  const remove = async (doc: TransactionDocument) => {
    setBusy(doc.id)
    const result = await txRequest(`/api/admin/transactions/documents/${doc.id}`, 'DELETE')
    setBusy(null)
    setConfirmRemove(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Document removed')
    onChanged()
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={DOC_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => upload(e.target.files)}
      />

      {documents.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
              </div>
              {confirmRemove === doc.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Remove?</span>
                  <Button type="button" size="sm" variant="destructive" disabled={busy === doc.id} onClick={() => remove(doc)}>
                    {busy === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : 'Remove'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmRemove(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-0.5">
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`View ${doc.filename}`} disabled={busy !== null} onClick={() => open(doc, false)}>
                    {busy === doc.id ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Download ${doc.filename}`} disabled={busy !== null} onClick={() => open(doc, true)}>
                    <Download className="size-4" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Replace ${doc.filename}`} disabled={busy !== null} onClick={() => pick(doc.id)}>
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" aria-label={`Remove ${doc.filename}`} disabled={busy !== null} onClick={() => setConfirmRemove(doc.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => pick(null)}>
          {busy === 'upload' ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy === 'upload' ? 'Uploading…' : 'Upload files'}
        </Button>
        <span className="text-xs text-muted-foreground">PDF, JPG, PNG or WEBP · up to 15 MB each</span>
      </div>
    </div>
  )
}