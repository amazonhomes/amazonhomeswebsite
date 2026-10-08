'use client'

import type { KeyboardEvent } from 'react'
import { Check, MapPin } from 'lucide-react'
import { ExternalLinkChip, FileCell, isExternalUrl } from '@/components/admin/transactions/file-cell'
import { StatusPill } from '@/components/admin/transactions/status-pill'
import { formatDate } from '@/lib/format'
import {
  ADDRESS_FIELD_KEY,
  DATE_CLOSED_FIELD_KEY,
  STATUS_FIELD_KEY,
  type FieldValue,
  type Transaction,
  type TransactionDocument,
  type TransactionField,
} from '@/lib/transactions'
import { formatPlainDate } from '@/lib/transactions-client'

interface TransactionsTableProps {
  fields: TransactionField[]
  rows: Transaction[]
  /** Documents grouped by `${transactionId}:${fieldKey}`, built once from the list payload. */
  docsByCell: Map<string, TransactionDocument[]>
  onOpen: (tx: Transaction) => void
  /** Full Sheet View: the table fills its parent and scrolls in both directions with a sticky header. */
  fullSheet?: boolean
}

const NOTES_FIELD_KEY = 'notes'
const NO_DOCS: TransactionDocument[] = []

/** Width per column type so short fields stay narrow and long text wraps instead of widening the sheet. */
function columnWidth(field: TransactionField): string {
  if (field.key === ADDRESS_FIELD_KEY) return 'min-w-[170px] w-[190px] max-w-[210px]'
  if (field.key === STATUS_FIELD_KEY) return 'min-w-[100px] w-[110px] max-w-[120px]'
  if (field.key === NOTES_FIELD_KEY) return 'min-w-[150px] w-[170px] max-w-[190px]'
  switch (field.fieldType) {
    case 'checkbox':
      return 'min-w-[65px] w-[72px] max-w-[80px]'
    case 'file':
      return 'min-w-[90px] w-[110px] max-w-[120px]'
    case 'date':
      return 'min-w-[90px] w-[96px] max-w-[110px]'
    case 'link':
      return 'min-w-[90px] w-[100px] max-w-[120px]'
    case 'select':
      return 'min-w-[100px] w-[110px] max-w-[130px]'
    case 'date_location':
      return 'min-w-[110px] w-[130px] max-w-[150px]'
    case 'textarea':
      return 'min-w-[150px] w-[170px] max-w-[190px]'
    default:
      return 'min-w-[110px] w-[125px] max-w-[140px]'
  }
}

/** Cloud-storage object keys (e.g. `abc-123/purchase.pdf`) are internal and never shown to users. */
const STORAGE_PATH = /^[\w-]+(\/[\w.\- ]+)+$/

const empty = <span className="text-muted-foreground">{'—'}</span>

function CellValue({
  field,
  value,
  docs,
}: {
  field: TransactionField
  value: FieldValue | undefined
  docs: TransactionDocument[]
}) {
  switch (field.fieldType) {
    case 'checkbox':
      return value === true ? (
        <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
          <Check className="size-3.5" aria-hidden="true" />
          Yes
        </span>
      ) : (
        <span className="text-muted-foreground">No</span>
      )
    case 'select':
      if (field.key === STATUS_FIELD_KEY) return <StatusPill status={typeof value === 'string' ? value : null} />
      return typeof value === 'string' && value ? <span className="line-clamp-2">{value}</span> : empty
    case 'date':
      return typeof value === 'string' && value ? <span className="whitespace-nowrap">{formatPlainDate(value)}</span> : empty
    case 'link':
      return typeof value === 'string' && value ? <ExternalLinkChip url={value} /> : empty
    case 'file':
      if (docs.length > 0) return <FileCell docs={docs} />
      if (typeof value === 'string' && value) {
        if (isExternalUrl(value)) return <ExternalLinkChip url={value.trim()} />
        if (STORAGE_PATH.test(value.trim())) return empty
        return (
          <span className="line-clamp-2 text-muted-foreground" title={value}>
            {value}
          </span>
        )
      }
      return empty
    case 'date_location': {
      const v = typeof value === 'object' && value ? value : null
      if (!v || (!v.date && !v.location)) return empty
      return (
        <div className="flex flex-col">
          {v.date && <span className="whitespace-nowrap">{formatPlainDate(v.date)}</span>}
          {v.location && (
            <span className="line-clamp-1 text-[11px] text-muted-foreground" title={v.location}>
              {v.location}
            </span>
          )}
        </div>
      )
    }
    default:
      if (typeof value !== 'string' || !value) return empty
      if (isExternalUrl(value)) return <ExternalLinkChip url={value.trim()} />
      return (
        <span
          className={`${field.key === NOTES_FIELD_KEY ? 'line-clamp-3' : 'line-clamp-2'} whitespace-pre-line break-words`}
          title={value}
        >
          {value}
        </span>
      )
  }
}

function openOnKey(e: KeyboardEvent, open: () => void) {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    open()
  }
}

/** Compact spreadsheet-style grid on desktop, stacked cards on mobile. */
export function TransactionsTable({ fields, rows, docsByCell, onOpen, fullSheet = false }: TransactionsTableProps) {
  const cardFields = fields.slice(1).filter((f) => f.key !== STATUS_FIELD_KEY).slice(0, 4)
  const docsFor = (tx: Transaction, f: TransactionField) => docsByCell.get(`${tx.id}:${f.key}`) ?? NO_DOCS

  return (
    <>
      <div className={fullSheet ? 'hidden min-h-0 flex-1 overflow-auto bg-card md:block' : 'hidden overflow-x-auto bg-card md:block'}>
        <table className="w-full min-w-full border-separate border-spacing-0 text-left text-xs leading-snug">
          <thead className={fullSheet ? 'sticky top-0 z-20' : undefined}>
            <tr>
              {fields.map((f, i) => (
                <th
                  key={f.id}
                  scope="col"
                  className={`border-b border-border bg-secondary px-2 py-1.5 align-bottom text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground ${columnWidth(f)} ${
                    i === 0 ? 'sticky left-0 z-10 border-r' : ''
                  }`}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((tx) => (
              <tr
                key={tx.id}
                tabIndex={0}
                onClick={() => onOpen(tx)}
                onKeyDown={(e) => openOnKey(e, () => onOpen(tx))}
                aria-label={`Open ${tx.propertyAddress}`}
                className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {fields.map((f, i) => (
                  <td
                    key={f.id}
                    className={`border-b border-border bg-card px-2 py-1.5 align-top text-foreground [overflow-wrap:anywhere] transition-colors group-hover:bg-muted ${columnWidth(f)} ${
                      i === 0 ? 'sticky left-0 z-10 border-r' : ''
                    }`}
                  >
                    {f.key === ADDRESS_FIELD_KEY ? (
                      <span className="font-semibold">{tx.propertyAddress}</span>
                    ) : (
                      <CellValue field={f} value={tx.values[f.key]} docs={docsFor(tx, f)} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-border bg-card md:hidden">
        {rows.map((tx) => (
          <li key={tx.id}>
            {/* A div (not a button) so file and link controls inside the card stay valid, separately tappable elements. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpen(tx)}
              onKeyDown={(e) => openOnKey(e, () => onOpen(tx))}
              aria-label={`Open ${tx.propertyAddress}`}
              className="flex w-full cursor-pointer flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-start gap-1.5 text-sm font-semibold text-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {tx.propertyAddress}
                </p>
                {tx.stage === 'active' ? (
                  <StatusPill status={tx.status} />
                ) : (
                  typeof tx.values[DATE_CLOSED_FIELD_KEY] === 'string' &&
                  tx.values[DATE_CLOSED_FIELD_KEY] && (
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {`Closed ${formatPlainDate(tx.values[DATE_CLOSED_FIELD_KEY] as string)}`}
                    </span>
                  )
                )}
              </div>
              {cardFields.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {cardFields.map((f) => (
                    <div key={f.id} className="min-w-0">
                      <dt className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                      <dd className="min-w-0 text-sm text-foreground [&_a]:py-1 [&_button]:py-1">
                        <CellValue field={f} value={tx.values[f.key]} docs={docsFor(tx, f)} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-xs text-muted-foreground">{`Updated ${formatDate(tx.updatedAt)}`}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}