'use client'

import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Download, ExternalLink, FileText, ImageIcon, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { TransactionDocument } from '@/lib/transactions'

/** Same-origin route that re-checks Admin + MFA, then redirects to a short-lived signed URL. */
export function documentUrl(doc: TransactionDocument, download = false) {
  return `/api/admin/transactions/${doc.transactionId}/documents/${doc.id}${download ? '?download=1' : ''}`
}

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i

function isImage(doc: TransactionDocument) {
  return /^image\/(jpeg|png|webp)$/.test(doc.mimeType) || IMAGE_EXT.test(doc.filename)
}

function DocIcon({ doc, className }: { doc: TransactionDocument; className?: string }) {
  if (isImage(doc)) return <ImageIcon className={className} aria-hidden="true" />
  if (doc.mimeType === 'application/pdf' || /\.(pdf|docx?)$/i.test(doc.filename)) return <FileText className={className} aria-hidden="true" />
  return <Paperclip className={className} aria-hidden="true" />
}

/** Cells sit inside a clickable row; interacting with a file must never also open the transaction editor. */
const stop = (e: MouseEvent | KeyboardEvent) => e.stopPropagation()

const chipClass =
  'inline-flex max-w-full min-w-0 items-center gap-1 rounded px-1 py-0.5 -mx-1 text-xs font-medium text-primary underline-offset-2 hover:bg-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-400'

function ImagePreview({ doc, onClose }: { doc: TransactionDocument | null; onClose: () => void }) {
  return (
    <Dialog open={doc !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl" onClick={stop} onKeyDown={stop}>
        {doc && (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-6" title={doc.filename}>
                {doc.filename}
              </DialogTitle>
              <DialogDescription>Private image. The link expires a few minutes after it is opened.</DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[65vh] items-center justify-center overflow-hidden rounded-md border border-border bg-secondary">
              {/* Plain img: the source is a redirecting, auth-checked route, which next/image cannot optimize. */}
              <img src={documentUrl(doc)} alt={doc.filename} className="max-h-[65vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" render={<a href={documentUrl(doc, true)} />}>
                <Download className="size-4" />
                Download
              </Button>
              <Button size="sm" render={<a href={documentUrl(doc)} target="_blank" rel="noopener noreferrer" />}>
                <ExternalLink className="size-4" />
                Open in new tab
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Opens a single document: images in a preview dialog, everything else (PDFs) in a new tab. */
function DocLink({
  doc,
  label,
  onPreview,
  className,
}: {
  doc: TransactionDocument
  label?: string
  onPreview: (doc: TransactionDocument) => void
  className?: string
}) {
  const content = (
    <>
      <DocIcon doc={doc} className="size-3.5 shrink-0" />
      <span className="truncate">{label ?? doc.filename}</span>
    </>
  )
  if (isImage(doc)) {
    return (
      <button
        type="button"
        title={doc.filename}
        aria-label={`Preview ${doc.filename}`}
        onClick={(e) => {
          stop(e)
          onPreview(doc)
        }}
        onKeyDown={stop}
        className={className ?? chipClass}
      >
        {content}
      </button>
    )
  }
  return (
    <a
      href={documentUrl(doc)}
      target="_blank"
      rel="noopener noreferrer"
      title={doc.filename}
      aria-label={`Open ${doc.filename} in a new tab`}
      onClick={stop}
      onKeyDown={stop}
      className={className ?? chipClass}
    >
      {content}
    </a>
  )
}

export function FileCell({ docs }: { docs: TransactionDocument[] }) {
  const [preview, setPreview] = useState<TransactionDocument | null>(null)
  if (docs.length === 0) return null

  const allImages = docs.every(isImage)

  return (
    <>
      {docs.length === 1 ? (
        <DocLink doc={docs[0]} onPreview={setPreview} />
      ) : (
        <Popover>
          <PopoverTrigger onClick={stop} onKeyDown={stop} className={chipClass} aria-label={`Show ${docs.length} files`}>
            {allImages ? <ImageIcon className="size-3.5 shrink-0" aria-hidden="true" /> : <Paperclip className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{`${docs.length} ${allImages ? 'photos' : 'files'}`}</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1" onClick={stop} onKeyDown={stop}>
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {allImages ? 'Photos' : 'Documents'}
            </p>
            <ul className="flex flex-col">
              {docs.map((doc) => (
                <li key={doc.id} className="flex items-center gap-1 rounded-md pr-1 hover:bg-secondary">
                  <DocLink
                    doc={doc}
                    onPreview={setPreview}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                  />
                  <a
                    href={documentUrl(doc, true)}
                    onClick={stop}
                    aria-label={`Download ${doc.filename}`}
                    title="Download"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      )}
      <ImagePreview doc={preview} onClose={() => setPreview(null)} />
    </>
  )
}

/** Compact, safe external link: shows the domain instead of the raw URL. */
export function ExternalLinkChip({ url }: { url: string }) {
  let host: string | null = null
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') host = parsed.hostname.replace(/^www\./, '')
  } catch {
    host = null
  }
  if (!host) return <span className="line-clamp-2 text-xs text-muted-foreground">{url}</span>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={url} onClick={stop} onKeyDown={stop} className={chipClass}>
      <span className="truncate">{host}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
    </a>
  )
}

export function isExternalUrl(value: string) {
  return /^https?:\/\/\S+$/i.test(value.trim())
}