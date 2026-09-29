'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

import { NumberedPagination } from '@/components/admin/data-table'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { formatCurrency } from '@/lib/format'
import { formatDeadline } from '@/lib/timezone'
import type { Property, PropertyStatus } from '@/lib/types'

const ROWS_PER_PAGE = 8

type Filter = 'all' | PropertyStatus

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All listings' },
  { id: 'available', label: 'Available' },
  { id: 'under-contract', label: 'Pending' },
  { id: 'sold', label: 'Sold' },
]

export function PropertiesTable({
  properties,
  onEdit,
  onDelete,
  onCreate,
}: {
  properties: Property[]
  onEdit: (p: Property) => void
  onDelete: (id: string) => void
  onCreate: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let base =
      filter === 'all'
        ? properties
        : properties.filter((p) => p.status === filter)

    if (query.trim()) {
      const q = query.trim().toLowerCase()

      base = base.filter((p) =>
        `${p.address} ${p.neighborhood} ${p.type}`
          .toLowerCase()
          .includes(q),
      )
    }

    return base
  }, [properties, filter, query])

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / ROWS_PER_PAGE),
  )

  const safePage = Math.min(page, pageCount - 1)

  const rows = filtered.slice(
    safePage * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE + ROWS_PER_PAGE,
  )

  useEffect(() => {
    setPage(0)
  }, [filter, query])

  const countFor = (id: Filter) =>
    id === 'all'
      ? properties.length
      : properties.filter((p) => p.status === id).length

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
    rows.length > 0 && rows.every((r) => selected.has(r.id))

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)

      if (allOnPageSelected) {
        rows.forEach((r) => next.delete(r.id))
      } else {
        rows.forEach((r) => next.add(r.id))
      }

      return next
    })
  }

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(0)
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {/* FILTERS + SEARCH + ADD PROPERTY */}
      <Tabs
        value={filter}
        onValueChange={(v) => changeFilter(v as Filter)}
        className="min-w-0"
      >
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Mobile/tablet scrollable tabs */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <TabsList className="inline-flex h-9 w-max min-w-max flex-nowrap">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="shrink-0 gap-1.5 whitespace-nowrap px-3"
                >
                  {t.label}

                  <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                    {countFor(t.id)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Search + button */}
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
                placeholder="Search listings…"
                aria-label="Search listings"
                className="
                  h-9 w-full rounded-md
                  border border-border
                  bg-background
                  pl-9 pr-3
                  text-sm text-foreground
                  outline-none
                  transition-colors
                  placeholder:text-muted-foreground
                  focus-visible:border-primary
                  focus-visible:ring-2
                  focus-visible:ring-primary/30
                "
              />
            </div>

            <Button
              onClick={onCreate}
              size="sm"
              className="w-full shrink-0 sm:w-auto"
            >
              <Plus className="size-4" />
              Add property
            </Button>
          </div>
        </div>
      </Tabs>

      {/* GLASS TABLE */}
      <div
        className="
          min-w-0
          overflow-hidden
          rounded-xl
          border border-black/[0.06]
          bg-white/55
          shadow-[0_8px_30px_rgba(0,0,0,0.04)]
          backdrop-blur-xl
          backdrop-saturate-150
          dark:border-white/10
          dark:bg-white/[0.035]
          dark:shadow-[0_8px_30px_rgba(0,0,0,0.18)]
        "
      >
        {/* Horizontal fallback */}
        <div className="w-full overflow-x-auto">
          <Table className="w-full min-w-[520px] md:min-w-[760px] lg:min-w-[1000px]">
            <TableHeader>
              <TableRow
                className="
                  border-b border-black/[0.06]
                  bg-white/35
                  backdrop-blur-2xl
                  backdrop-saturate-150
                  hover:bg-white/35
                  dark:border-white/10
                  dark:bg-white/[0.06]
                  dark:hover:bg-white/[0.06]
                "
              >
                {/* Checkbox hidden on very small screens */}
                <TableHead className="hidden w-10 sm:table-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="size-4 cursor-pointer accent-primary"
                  />
                </TableHead>

                <TableHead className="min-w-[180px]">
                  Property
                </TableHead>

                {/* Hide type on mobile */}
                <TableHead className="hidden md:table-cell">
                  Type
                </TableHead>

                <TableHead>Status</TableHead>

                <TableHead className="whitespace-nowrap text-right">
                  Price
                </TableHead>

                {/* Beds/Baths tablet+ */}
                <TableHead className="hidden text-right lg:table-cell">
                  Beds
                </TableHead>

                <TableHead className="hidden text-right lg:table-cell">
                  Baths
                </TableHead>

                {/* Neighborhood desktop+ */}
                <TableHead className="hidden xl:table-cell">
                  Neighborhood
                </TableHead>

                {/* Deadline wide desktop only */}
                <TableHead className="hidden 2xl:table-cell">
                  Offer deadline
                </TableHead>

                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No listings in this view.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow
                    key={p.id}
                    data-state={
                      selected.has(p.id)
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
                    {/* Checkbox */}
                    <TableCell className="hidden sm:table-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.address}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="size-4 cursor-pointer accent-primary"
                      />
                    </TableCell>

                    {/* Property */}
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <img
                          src={
                            p.photos[0]?.url ||
                            '/placeholder.svg'
                          }
                          alt=""
                          className="
                            size-8 shrink-0
                            rounded-md object-cover
                            sm:size-9
                          "
                        />

                        <span
                          className="
                            block max-w-[125px]
                            truncate
                            font-medium text-foreground
                            sm:max-w-[180px]
                            md:max-w-[220px]
                          "
                          title={p.address}
                        >
                          {p.address}
                        </span>
                      </div>
                    </TableCell>

                    {/* Type */}
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className="whitespace-nowrap capitalize"
                      >
                        {p.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={p.status} />
                    </TableCell>

                    {/* Price */}
                    <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                      {formatCurrency(p.price)}
                    </TableCell>

                    {/* Beds */}
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                      {p.beds}
                    </TableCell>

                    {/* Baths */}
                    <TableCell className="hidden text-right tabular-nums text-muted-foreground lg:table-cell">
                      {p.baths}
                    </TableCell>

                    {/* Neighborhood */}
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                      {p.neighborhood}
                    </TableCell>

                    {/* Offer deadline */}
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground 2xl:table-cell">
                      {p.offerDeadline
                        ? formatDeadline(p.offerDeadline)
                        : '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="sticky right-0 bg-inherit">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />

                            <span className="sr-only">
                              Open menu for {p.address}
                            </span>
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onEdit(p)}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(p.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-xs text-muted-foreground sm:text-left sm:text-sm">
          Showing {rows.length} of {filtered.length}

          {selected.size > 0 && (
            <span> · {selected.size} selected</span>
          )}
        </p>

        <div className="flex justify-center sm:justify-end">
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