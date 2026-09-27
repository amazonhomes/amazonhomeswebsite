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
  total: number
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
        )
      )}

      <Button
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        onClick={() =>
          onPage(Math.min(pageCount - 1, page + 1))
        }
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
  const [selected, setSelected] = useState<Set<string>>(
    new Set()
  )

  const [page, setPage] = useState(0)

  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let base =
      !tabs ||
      !activeTab ||
      activeTab === 'all' ||
      !filterFor
        ? rows
        : rows.filter((row) =>
            filterFor(row, activeTab)
          )

    if (searchable && query.trim()) {
      const q = query.trim().toLowerCase()

      base = base.filter((row) =>
        searchable(row).toLowerCase().includes(q)
      )
    }

    return base
  }, [
    rows,
    tabs,
    activeTab,
    filterFor,
    searchable,
    query,
  ])

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / ROWS_PER_PAGE)
  )

  const safePage = Math.min(page, pageCount - 1)

  const pageRows = filtered.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE
  )

  /**
   * Reset pagination when filter/search changes.
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
    pageRows.every((row) =>
      selected.has(row.id)
    )

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (allOnPageSelected) {
        pageRows.forEach((row) =>
          next.delete(row.id)
        )
      } else {
        pageRows.forEach((row) =>
          next.add(row.id)
        )
      }

      return next
    })
  }

  const colSpan =
    columns.length + (action ? 2 : 1)

  return (
    <section className="flex w-full min-w-0 flex-col gap-4">
      {/* =====================================================
          RESPONSIVE TOOLBAR
      ===================================================== */}

      {(tabs || searchable) && (
        <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* FILTER TABS */}
          {tabs &&
          activeTab &&
          onTabChange ? (
            <div className="w-full min-w-0 overflow-x-auto lg:w-auto">
              <Tabs
                value={activeTab}
                onValueChange={onTabChange}
                className="w-full lg:w-auto"
              >
                <TabsList
                  className="
                    grid
                    h-auto
                    min-w-[390px]
                    grid-cols-4
                    bg-muted/70
                    p-1
                    sm:min-w-0
                    lg:flex
                    lg:w-auto
                  "
                >
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="
                        min-w-0
                        gap-1.5
                        whitespace-nowrap
                        px-2
                        text-xs
                        sm:px-3
                        sm:text-sm
                      "
                    >
                      <span className="truncate">
                        {tab.label}
                      </span>

                      {countFor && (
                        <span
                          className="
                            shrink-0
                            rounded-full
                            bg-muted
                            px-1.5
                            text-[10px]
                            font-semibold
                            text-muted-foreground
                            sm:text-xs
                          "
                        >
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
            <div className="relative w-full lg:w-64 lg:shrink-0">
              <Search
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  size-4
                  -translate-y-1/2
                  text-muted-foreground
                "
                aria-hidden
              />

              <input
                type="search"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
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
          )}
        </div>
      )}

      {/* =====================================================
          TABLE
          
          IMPORTANT:
          We do NOT compress all desktop columns into the
          phone width. The table scrolls horizontally instead.
      ===================================================== */}

      <div
        className="
          w-full
          min-w-0
          overflow-hidden
          rounded-xl
          border
          border-border
          bg-card
        "
      >
        <div className="w-full overflow-x-auto">
          <Table className="min-w-max">
            {/* GLASS HEADER */}
            <TableHeader>
              <TableRow
                className="
                  border-b
                  border-border
                  bg-white/65
                  backdrop-blur-xl
                  hover:bg-white/65
                  dark:bg-white/[0.04]
                  dark:hover:bg-white/[0.04]
                "
              >
                <TableHead className="w-10 min-w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="
                      size-4
                      cursor-pointer
                      accent-primary
                    "
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
                      ${
                        column.headClassName ??
                        ''
                      }
                    `}
                  >
                    {column.header}
                  </TableHead>
                ))}

                {action && (
                  <TableHead className="w-10 min-w-10" />
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan}
                    className="
                      h-24
                      min-w-[280px]
                      text-center
                      text-muted-foreground
                    "
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
                      transition-colors
                      hover:bg-muted/30
                    "
                  >
                    {/* SELECT */}
                    <TableCell className="w-10 min-w-10">
                      <input
                        type="checkbox"
                        aria-label={rowLabel(row)}
                        checked={selected.has(
                          row.id
                        )}
                        onChange={() =>
                          toggle(row.id)
                        }
                        className="
                          size-4
                          cursor-pointer
                          accent-primary
                        "
                      />
                    </TableCell>

                    {/* DATA */}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`
                          whitespace-nowrap
                          ${
                            column.align ===
                            'right'
                              ? 'text-right'
                              : ''
                          }
                          ${
                            column.cellClassName ??
                            ''
                          }
                        `}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}

                    {/* ACTIONS */}
                    {action && (
                      <TableCell className="w-10 min-w-10">
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
          RESPONSIVE FOOTER
      ===================================================== */}

      <div
        className="
          flex
          w-full
          min-w-0
          flex-col
          gap-3
          px-1
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <p className="text-sm text-muted-foreground">
          Showing {pageRows.length} of{' '}
          {filtered.length}

          {selected.size > 0 && (
            <span>
              {' '}
              · {selected.size} selected
            </span>
          )}
        </p>

        <div className="max-w-full self-end overflow-x-auto sm:self-auto">
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