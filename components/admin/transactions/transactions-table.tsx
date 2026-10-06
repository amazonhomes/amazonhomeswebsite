'use client'

import { Check, ExternalLink, MapPin, Paperclip } from 'lucide-react'
import { StatusPill } from '@/components/admin/transactions/status-pill'
import { formatDate } from '@/lib/format'
import {
  ADDRESS_FIELD_KEY,
  DATE_CLOSED_FIELD_KEY,
  STATUS_FIELD_KEY,
  type FieldValue,
  type Transaction,
  type TransactionField,
} from '@/lib/transactions'
import { formatPlainDate } from '@/lib/transactions-client'

interface TransactionsTableProps {
  fields: TransactionField[]
  rows: Transaction[]
  docCounts: Map<string, number>
  onOpen: (tx: Transaction) => void
}

const empty = <span className="text-muted-foreground">{'—'}</span>

function CellValue({
  field,
  value,
  docCount,
}: {
  field: TransactionField
  value: FieldValue | undefined
  docCount: number
}) {
  switch (field.fieldType) {
    case 'checkbox':
      return value === true ? (
        <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
          <Check className="size-4" aria-hidden="true" />
          Yes
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">No</span>
      )
    case 'select':
      if (field.key === STATUS_FIELD_KEY) return <StatusPill status={typeof value === 'string' ? value : null} />
      return typeof value === 'string' && value ? <span className="text-sm">{value}</span> : empty
    case 'date':
      return typeof value === 'string' && value ? <span className="whitespace-nowrap text-sm">{formatPlainDate(value)}</span> : empty
    case 'link':
      return typeof value === 'string' && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      ) : (
        empty
      )
    case 'file':
      return docCount > 0 ? (
        <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm">
          <Paperclip className="size-3.5 text-muted-foreground" aria-hidden="true" />
          {`${docCount} file${docCount === 1 ? '' : 's'}`}
        </span>
      ) : typeof value === 'string' && value ? (
        <span className="line-clamp-2 text-sm text-muted-foreground">{value}</span>
      ) : (
        empty
      )
    case 'date_location': {
      const v = typeof value === 'object' && value ? value : null
      if (!v || (!v.date && !v.location)) return empty
      return (
        <div className="flex flex-col text-sm">
          {v.date && <span className="whitespace-nowrap">{formatPlainDate(v.date)}</span>}
          {v.location && <span className="line-clamp-1 text-xs text-muted-foreground">{v.location}</span>}
        </div>
      )
    }
    default:
      return typeof value === 'string' && value ? (
        <span className="line-clamp-2 whitespace-pre-line text-sm" title={value}>
          {value}
        </span>
      ) : (
        empty
      )
  }
}

/** Spreadsheet-style table on desktop, stacked cards on mobile. */
export function TransactionsTable({ fields, rows, docCounts, onOpen }: TransactionsTableProps) {
  const cardFields = fields.slice(1).filter((f) => f.key !== STATUS_FIELD_KEY).slice(0, 4)

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-max border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              {fields.map((f, i) => (
                <th
                  key={f.id}
                  scope="col"
                  className={`border-b border-border bg-secondary/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
                    i === 0 ? 'sticky left-0 z-10 min-w-56 bg-secondary' : 'min-w-36'
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(tx)
                  }
                }}
                aria-label={`Open ${tx.propertyAddress}`}
                className="group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {fields.map((f, i) => (
                  <td
                    key={f.id}
                    className={`max-w-72 border-b border-border px-4 py-3 align-top transition-colors group-hover:bg-secondary/50 ${
                      i === 0 ? 'sticky left-0 z-10 bg-card font-medium text-foreground' : 'text-foreground'
                    }`}
                  >
                    {f.key === ADDRESS_FIELD_KEY ? (
                      <span className="text-sm font-semibold">{tx.propertyAddress}</span>
                    ) : (
                      <CellValue field={f} value={tx.values[f.key]} docCount={docCounts.get(`${tx.id}:${f.key}`) ?? 0} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-border md:hidden">
        {rows.map((tx) => (
          <li key={tx.id}>
            <button
              type="button"
              onClick={() => onOpen(tx)}
              className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/50 focus-visible:bg-secondary/50 focus-visible:outline-none"
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
                      <dd className="min-w-0">
                        <CellValue field={f} value={tx.values[f.key]} docCount={docCounts.get(`${tx.id}:${f.key}`) ?? 0} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="text-xs text-muted-foreground">{`Updated ${formatDate(tx.updatedAt)}`}</p>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}