'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type Column<T> = {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  headClassName?: string
  cellClassName?: string
}

export type TabDef = { id: string; label: string }

const ROWS_PER_PAGE = 8

/** Build a page-number list with ellipsis gaps, e.g. [1, '…', 4, 5, 6, '…', 9]. */
export function pageList(current: number, total: number): (number | '…')[] {
  const c = current + 1
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = [1]
  if (c > 3) pages.push('…')
  const start = Math.max(2, c - 1)
  const end = Math.min(total - 1, c + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (c < total - 2) pages.push('…')
  pages.push(total)
  return pages
}

/** Numbered pagination with prev/next controls, styled to match the dashboard. */
export function NumberedPagination({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  const current = page + 1
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onPage(Math.max(0, page - 1))}
        disabled={page === 0}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </Button>
      {pageList(page, pageCount).map((item, idx) =>
        item === '…' ? (
          <span
            key={`ellipsis-${idx}`}
            className="flex size-8 items-center justify-center text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPage(item - 1)}
            aria-current={current === item ? 'page' : undefined}
            className={`flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
              current === item
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {item}
          </button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        onClick={() => onPage(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  tabs,
  activeTab,
  onTabChange,
  countFor,
  filterFor,
  rowLabel,
  action,
  searchable,
  searchPlaceholder = 'Search…',
  emptyLabel = 'Nothing to show here yet.',
}: {
  rows: T[]
  columns: Column<T>[]
  /** Optional filter tabs shown above the table. */
  tabs?: TabDef[]
  activeTab?: string
  onTabChange?: (id: string) => void
  countFor?: (id: string) => number
  /** Returns whether a row belongs to the given tab. Required when tabs are set. */
  filterFor?: (row: T, tabId: string) => boolean
  /** Accessible label for a row's select checkbox. */
  rowLabel: (row: T) => string
  /** Optional trailing actions cell (e.g. a dropdown menu) rendered per row. */
  action?: (row: T) => ReactNode
  /** Provide a searchable text accessor to render a search box in the toolbar. */
  searchable?: (row: T) => string
  searchPlaceholder?: string
  emptyLabel?: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let base =
      !tabs || !activeTab || activeTab === 'all' || !filterFor
        ? rows
        : rows.filter((r) => filterFor(r, activeTab))
    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase()
      base = base.filter((r) => searchable(r).toLowerCase().includes(q))
    }
    return base
  }, [rows, tabs, activeTab, filterFor, searchable, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE)

  // Reset to the first page whenever the active filter or search changes.
  useEffect(() => {
    setPage(0)
  }, [activeTab, query])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) pageRows.forEach((r) => next.delete(r.id))
      else pageRows.forEach((r) => next.add(r.id))
      return next
    })

  const colSpan = columns.length + (action ? 2 : 1)

  return (
    <section className="flex flex-col gap-4">
      {(tabs || searchable) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {tabs && activeTab && onTabChange ? (
            <Tabs value={activeTab} onValueChange={onTabChange}>
              <TabsList className="flex-wrap">
                {tabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                    {t.label}
                    {countFor && (
                      <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                        {countFor(t.id)}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : (
            <span />
          )}
          {searchable && (
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  className="size-4 cursor-pointer accent-primary"
                />
              </TableHead>
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  className={`${c.align === 'right' ? 'text-right' : ''} ${c.headClassName ?? ''}`}
                >
                  {c.header}
                </TableHead>
              ))}
              {action && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="h-24 text-center text-muted-foreground">
                  {query.trim() ? 'No results match your search.' : emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow key={row.id} data-state={selected.has(row.id) ? 'selected' : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={rowLabel(row)}
                      checked={selected.has(row.id)}
                      onChange={() => toggle(row.id)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </TableCell>
                  {columns.map((c) => (
                    <TableCell
                      key={c.key}
                      className={`${c.align === 'right' ? 'text-right' : ''} ${c.cellClassName ?? ''}`}
                    >
                      {c.cell(row)}
                    </TableCell>
                  ))}
                  {action && <TableCell>{action(row)}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <p className="text-sm text-muted-foreground">
          Showing {pageRows.length} of {filtered.length}
          {selected.size > 0 && <span> · {selected.size} selected</span>}
        </p>
        <NumberedPagination page={safePage} pageCount={pageCount} onPage={setPage} />
      </div>
    </section>
  )
}
