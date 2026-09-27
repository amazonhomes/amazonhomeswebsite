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

export type TabDef = {
  id: string
  label: string
}

const ROWS_PER_PAGE = 8

/**
 * Build a page-number list with ellipsis gaps.
 * Example: [1, '…', 4, 5, 6, '…', 9]
 */
export function pageList(
  current: number,
  total: number,
): (number | '…')[] {
  const c = current + 1

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | '…')[] = [1]

  if (c > 3) {
    pages.push('…')
  }

  const start = Math.max(2, c - 1)
  const end = Math.min(total - 1, c + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (c < total - 2) {
    pages.push('…')
  }

  pages.push(total)

  return pages
}

/**
 * Responsive numbered pagination.
 */
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
    <div className="flex max-w-full items-center gap-1 overflow-x-auto">
      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
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
            className="flex size-8 shrink-0 items-center justify-center text-sm text-muted-foreground"
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
            className={`flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors ${
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
        className="size-8 shrink-0"
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

  /**
   * Returns whether a row belongs to the given tab.
   * Required when tabs are set.
   */
  filterFor?: (row: T, tabId: string) => boolean

  /** Accessible label for a row's select checkbox. */
  rowLabel: (row: T) => string

  /**
   * Optional trailing actions cell.
   * Example: dropdown menu.
   */
  action?: (row: T) => ReactNode

  /**
   * Provide searchable text accessor
   * to render a search box.
   */
  searchable?: (row: T) => string

  searchPlaceholder?: string

  emptyLabel?: string
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let base =
      !tabs ||
      !activeTab ||
      activeTab === 'all' ||
      !filterFor
        ? rows
        : rows.filter((row) => filterFor(row, activeTab))

    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase()

      base = base.filter((row) =>
        searchable(row).toLowerCase().includes(q),
      )
    }

    return base
  }, [rows, tabs, activeTab, filterFor, searchable, query])

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / ROWS_PER_PAGE),
  )

  const safePage = Math.min(page, pageCount - 1)

  const pageRows = filtered.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE,
  )

  /**
   * Reset pagination whenever filter/search changes.
   */
  useEffect(() => {
    setPage(0)
  }, [activeTab, query])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }

  const allOnPageSelected =
    pageRows.length > 0 &&
    pageRows.every((row) => selected.has(row.id))

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (allOnPageSelected) {
        pageRows.forEach((row) => next.delete(row.id))
      } else {
        pageRows.forEach((row) => next.add(row.id))
      }

      return next
    })
  }

  const colSpan = columns.length + (action ? 2 : 1)

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {/* =====================================================
          FILTER TABS + SEARCH
      ===================================================== */}

      {(tabs || searchable) && (
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* FILTER TABS */}
          {tabs && activeTab && onTabChange ? (
            <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
              <Tabs
                value={activeTab}
                onValueChange={onTabChange}
                className="min-w-0"
              >
                <TabsList className="inline-flex h-9 w-max min-w-max flex-nowrap">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="shrink-0 gap-1.5 whitespace-nowrap px-3"
                    >
                      {tab.label}

                      {countFor && (
                        <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                          {countFor(tab.id)}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          ) : (
            <span />
          )}

          {/* SEARCH */}
          {searchable && (
            <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:justify-end">
              <div className="relative min-w-0 flex-1 sm:min-w-[220px] xl:w-56 xl:flex-none">
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
                  className="
                    h-9
                    w-full
                    rounded-md
                    border
                    border-border
                    bg-background
                    pl-9
                    pr-3
                    text-sm
                    text-foreground
                    outline-none
                    transition-colors
                    placeholder:text-muted-foreground
                    focus-visible:border-primary
                    focus-visible:ring-2
                    focus-visible:ring-primary/30
                  "
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          GLASS TABLE
      ===================================================== */}

      <div
        className="
          min-w-0
          overflow-hidden
          rounded-xl
          border
          border-black/[0.06]
          bg-white/55
          shadow-[0_8px_30px_rgba(0,0,0,0.04)]
          backdrop-blur-xl
          backdrop-saturate-150
          dark:border-white/10
          dark:bg-white/[0.035]
          dark:shadow-[0_8px_30px_rgba(0,0,0,0.18)]
        "
      >
        {/* Horizontal scroll fallback for smaller screens */}
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-[520px] md:min-w-[760px] lg:min-w-[1000px]">
            <TableHeader>
              <TableRow
                className="
                  border-b
                  border-black/[0.06]
                  bg-white/35
                  backdrop-blur-2xl
                  backdrop-saturate-150
                  hover:bg-white/35
                  dark:border-white/10
                  dark:bg-white/[0.06]
                  dark:hover:bg-white/[0.06]
                "
              >
                {/* Hide checkbox on very small screens */}
                <TableHead className="hidden w-10 sm:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </TableHead>

                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={`
                      whitespace-nowrap
                      ${
                        column.align === 'right'
                          ? 'text-right'
                          : ''
                      }
                      ${column.headClassName ?? ''}
                    `}
                  >
                    {column.header}
                  </TableHead>
                ))}

                {action && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {query.trim()
                      ? 'No results match your search.'
                      : emptyLabel}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={
                      selected.has(row.id)
                        ? 'selected'
                        : undefined
                    }
                    className="
                      border-black/[0.05]
                      bg-transparent
                      transition-colors
                      hover:bg-black/[0.025]
                      data-[state=selected]:bg-primary/[0.06]
                      dark:border-white/[0.07]
                      dark:hover:bg-white/[0.04]
                      dark:data-[state=selected]:bg-primary/10
                    "
                  >
                    {/* Hide checkbox on very small screens */}
                    <TableCell className="hidden sm:table-cell">
                      <input
                        type="checkbox"
                        aria-label={rowLabel(row)}
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        className="size-4 cursor-pointer accent-primary"
                      />
                    </TableCell>

                    {/* DATA */}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`
                          whitespace-nowrap
                          ${
                            column.align === 'right'
                              ? 'text-right'
                              : ''
                          }
                          ${column.cellClassName ?? ''}
                        `}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}

                    {/* ACTIONS */}
                    {action && (
                      <TableCell className="sticky right-0 bg-inherit">
                        {action(row)}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* =====================================================
          RESPONSIVE PAGINATION
      ===================================================== */}

      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          Showing {pageRows.length} of {filtered.length}

          {selected.size > 0 && (
            <span> · {selected.size} selected</span>
          )}
        </p>

        <div className="flex max-w-full justify-center overflow-x-auto sm:justify-end">
          <NumberedPagination
            page={safePage}
            pageCount={pageCount}
            onPage={setPage}
          />
        </div>
      </div>
    </section>
  )
}