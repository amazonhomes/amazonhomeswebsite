'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { BriefcaseBusiness, Columns3, Maximize2, Minimize2, Plus, RotateCw } from 'lucide-react'
import { ColumnsDialog } from '@/components/admin/transactions/columns-dialog'
import { DeleteDialog, MoveDialog } from '@/components/admin/transactions/confirm-dialogs'
import { TransactionDialog } from '@/components/admin/transactions/transaction-dialog'
import { TransactionsTable } from '@/components/admin/transactions/transactions-table'
import {
  NumberedPagination,
  ROWS_PER_PAGE,
  TableSearchInput,
  matchesSearch,
  rangeLabel,
} from '@/components/admin/data-table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DATE_CLOSED_FIELD_KEY,
  STAGES,
  STAGE_LABELS,
  STATUS_FIELD_KEY,
  valueText,
  type Stage,
  type Transaction,
  type TransactionDocument,
  type TransactionsPayload,
} from '@/lib/transactions'
import { TRANSACTIONS_KEY, fetchTransactions } from '@/lib/transactions-client'
import { cn } from '@/lib/utils'

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; id: string }
  | { kind: 'move'; id: string }
  | { kind: 'delete'; id: string }
  | { kind: 'columns' }
  | null

const ALL_STATUSES = '__all__'

export function TransactionsWorkspace() {
  const { data, error, isLoading, mutate } = useSWR<TransactionsPayload>(TRANSACTIONS_KEY, fetchTransactions, {
    revalidateOnFocus: false,
  })
  const [stage, setStage] = useState<Stage>('active')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES)
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [fullSheet, setFullSheet] = useState(false)

  // Escape exits Full Sheet View only when no dialog is open (the dialog owns Escape then).
  useEffect(() => {
    if (!fullSheet) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dialog === null) setFullSheet(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [fullSheet, dialog])

  const allFields = useMemo(() => data?.fields ?? [], [data])
  const stageFields = useMemo(
    () => allFields.filter((f) => f.stage === stage).sort((a, b) => a.position - b.position),
    [allFields, stage],
  )
  const visibleFields = useMemo(() => stageFields.filter((f) => f.isVisible), [stageFields])
  const statusOptions = useMemo(
    () => stageFields.find((f) => f.key === STATUS_FIELD_KEY)?.options ?? [],
    [stageFields],
  )

  const transactions = useMemo(() => data?.transactions ?? [], [data])
  const documents = useMemo(() => data?.documents ?? [], [data])
  const docsByCell = useMemo(() => {
    const map = new Map<string, TransactionDocument[]>()
    for (const d of documents) {
      const key = `${d.transactionId}:${d.fieldKey}`
      const list = map.get(key)
      if (list) list.push(d)
      else map.set(key, [d])
    }
    return map
  }, [documents])

  const counts = useMemo(
    () => ({
      active: transactions.filter((t) => t.stage === 'active').length,
      post_closing: transactions.filter((t) => t.stage === 'post_closing').length,
    }),
    [transactions],
  )

  const filtered = useMemo(() => {
    const inStage = transactions.filter((t) => t.stage === stage)
    const byStatus =
      stage === 'active' && statusFilter !== ALL_STATUSES ? inStage.filter((t) => t.status === statusFilter) : inStage
    const searched = query.trim()
      ? byStatus.filter((t) =>
          matchesSearch(
            [t.propertyAddress, ...visibleFields.map((f) => valueText(t.values[f.key]))].join(' '),
            query,
          ),
        )
      : byStatus
    if (stage === 'post_closing') {
      const closed = (t: Transaction) => {
        const v = t.values[DATE_CLOSED_FIELD_KEY]
        return typeof v === 'string' ? v : ''
      }
      return [...searched].sort((a, b) => closed(b).localeCompare(closed(a)) || b.updatedAt.localeCompare(a.updatedAt))
    }
    return searched
  }, [transactions, stage, statusFilter, query, visibleFields])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * ROWS_PER_PAGE, (safePage + 1) * ROWS_PER_PAGE)

  const findTx = (id: string) => transactions.find((t) => t.id === id) ?? null
  const reload = () => mutate()

  const upsertLocal = (tx: Transaction) =>
    mutate(
      (prev) =>
        prev && {
          ...prev,
          transactions: prev.transactions.some((t) => t.id === tx.id)
            ? prev.transactions.map((t) => (t.id === tx.id ? tx : t))
            : [tx, ...prev.transactions],
        },
      { revalidate: false },
    )

  const switchStage = (next: Stage) => {
    setStage(next)
    setPage(0)
    setStatusFilter(ALL_STATUSES)
  }

  const editingTx = dialog?.kind === 'edit' ? findTx(dialog.id) : null
  const editFields = editingTx
    ? allFields.filter((f) => f.stage === editingTx.stage && f.isVisible).sort((a, b) => a.position - b.position)
    : visibleFields

  const filtersActive = query.trim() !== '' || statusFilter !== ALL_STATUSES

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track every deal from contract to closing, with documents in one place.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog({ kind: 'columns' })} disabled={!data}>
            <Columns3 className="size-4" />
            Manage columns
          </Button>
          <Button onClick={() => setDialog({ kind: 'create' })} disabled={!data}>
            <Plus className="size-4" />
            New transaction
          </Button>
        </div>
      </div>

      <div
        role={fullSheet ? 'dialog' : undefined}
        aria-modal={fullSheet || undefined}
        aria-label={fullSheet ? `Full sheet view: ${STAGE_LABELS[stage]}` : undefined}
        className={cn(
          'flex flex-col',
          fullSheet ? 'fixed inset-0 z-40 gap-3 bg-white p-3 lg:p-4' : 'gap-5',
        )}
      >
      {fullSheet && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {'Transactions · '}
            <span className="text-primary">{STAGE_LABELS[stage]}</span>
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'columns' })} disabled={!data}>
              <Columns3 className="size-4" />
              Manage columns
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: 'create' })} disabled={!data}>
              <Plus className="size-4" />
              New transaction
            </Button>
            <Button size="sm" onClick={() => setFullSheet(false)}>
              <Minimize2 className="size-4" />
              Exit Full Sheet View
            </Button>
          </div>
        </div>
      )}

      <div role="tablist" aria-label="Transaction stage" className="flex gap-1 border-b border-border">
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={stage === s}
            onClick={() => switchStage(s)}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              stage === s
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {STAGE_LABELS[s]}
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs tabular-nums',
                stage === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
              )}
            >
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      <section
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card',
          fullSheet && 'flex min-h-0 flex-1 flex-col',
        )}
        aria-label={STAGE_LABELS[stage]}
      >
        <div
          className={cn(
            'flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center',
            fullSheet ? 'p-3' : 'p-4',
          )}
        >
          <div className="flex-1">
            <TableSearchInput
              value={query}
              onChange={(v) => {
                setQuery(v)
                setPage(0)
              }}
              placeholder="Search address, buyer, seller, notes…"
            />
          </div>
          {stage === 'active' && statusOptions.length > 0 && (
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v ?? ALL_STATUSES)
                setPage(0)
              }}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by status">
                <SelectValue>{(v: string | null) => (!v || v === ALL_STATUSES ? 'All statuses' : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {statusOptions.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!fullSheet && (
            <Button variant="outline" className="hidden md:inline-flex" onClick={() => setFullSheet(true)} disabled={!data}>
              <Maximize2 className="size-4" />
              Full Sheet View
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Loading transactions">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-secondary" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <p className="text-sm text-foreground">Transactions could not be loaded.</p>
            <Button variant="outline" size="sm" onClick={reload}>
              <RotateCw className="size-4" />
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-secondary">
              <BriefcaseBusiness className="size-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {filtersActive
                ? 'No transactions match your filters.'
                : stage === 'active'
                  ? 'No active transactions yet.'
                  : 'No closed transactions yet.'}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filtersActive
                ? 'Try a different search or status.'
                : stage === 'active'
                  ? 'Create a transaction when a property goes under contract.'
                  : 'Move a transaction here from Active once it closes.'}
            </p>
            {filtersActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery('')
                  setStatusFilter(ALL_STATUSES)
                }}
              >
                Clear filters
              </Button>
            ) : (
              stage === 'active' && (
                <Button size="sm" onClick={() => setDialog({ kind: 'create' })}>
                  <Plus className="size-4" />
                  New transaction
                </Button>
              )
            )}
          </div>
        ) : (
          <>
            <TransactionsTable
              fields={visibleFields}
              rows={pageRows}
              docsByCell={docsByCell}
              onOpen={(tx) => setDialog({ kind: 'edit', id: tx.id })}
              fullSheet={fullSheet}
            />
            <div
              className={cn(
                'flex flex-col items-center justify-between gap-3 border-t border-border px-4 sm:flex-row',
                fullSheet ? 'py-2' : 'py-3',
              )}
            >
              <p className="text-sm text-muted-foreground">
                {rangeLabel(safePage, ROWS_PER_PAGE, pageRows.length, filtered.length)}
              </p>
              <NumberedPagination page={safePage} pageCount={pageCount} onPage={setPage} />
            </div>
          </>
        )}
      </section>
      </div>

      {(dialog?.kind === 'create' || editingTx) && (
        <TransactionDialog
          key={editingTx?.id ?? 'new'}
          transaction={editingTx}
          fields={editFields}
          documents={editingTx ? documents.filter((d) => d.transactionId === editingTx.id) : []}
          onClose={() => setDialog(null)}
          onSaved={(tx, created) => {
            upsertLocal(tx)
            if (created) {
              if (stage !== 'active') switchStage('active')
              setDialog({ kind: 'edit', id: tx.id })
            }
          }}
          onDocumentsChanged={reload}
          onMove={(tx) => setDialog({ kind: 'move', id: tx.id })}
          onDelete={(tx) => setDialog({ kind: 'delete', id: tx.id })}
        />
      )}

      {dialog?.kind === 'move' && findTx(dialog.id) && (
        <MoveDialog
          transaction={findTx(dialog.id) as Transaction}
          onClose={() => setDialog({ kind: 'edit', id: dialog.id })}
          onMoved={(tx) => {
            upsertLocal(tx)
            switchStage(tx.stage)
            setDialog(null)
          }}
        />
      )}

      {dialog?.kind === 'delete' && findTx(dialog.id) && (
        <DeleteDialog
          transaction={findTx(dialog.id) as Transaction}
          documentCount={documents.filter((d) => d.transactionId === dialog.id).length}
          onClose={() => setDialog({ kind: 'edit', id: dialog.id })}
          onDeleted={(id) => {
            mutate(
              (prev) =>
                prev && {
                  ...prev,
                  transactions: prev.transactions.filter((t) => t.id !== id),
                  documents: prev.documents.filter((d) => d.transactionId !== id),
                },
              { revalidate: false },
            )
            setDialog(null)
          }}
        />
      )}

      {dialog?.kind === 'columns' && (
        <ColumnsDialog stage={stage} fields={stageFields} onClose={() => setDialog(null)} onChanged={reload} />
      )}
    </div>
  )
}
