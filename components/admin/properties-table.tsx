'use client'

import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/format'
import { formatDeadline } from '@/lib/timezone'
import type { Property, PropertyStatus } from '@/lib/types'

const ROWS_PER_PAGE = 8

type Filter = 'all' | PropertyStatus

const TABS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All listings' },
  { id: 'available', label: 'Available' },
  { id: 'under-contract', label: 'Under contract' },
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
    let base = filter === 'all' ? properties : properties.filter((p) => p.status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      base = base.filter((p) =>
        `${p.address} ${p.neighborhood} ${p.type}`.toLowerCase().includes(q),
      )
    }
    return base
  }, [properties, filter, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const safePage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(safePage * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE + ROWS_PER_PAGE)

  useEffect(() => {
    setPage(0)
  }, [filter, query])

  const countFor = (id: Filter) =>
    id === 'all' ? properties.length : properties.filter((p) => p.status === id).length

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) rows.forEach((r) => next.delete(r.id))
      else rows.forEach((r) => next.add(r.id))
      return next
    })
  }

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setPage(0)
  }

  return (
    <section className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={(v) => changeFilter(v as Filter)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="flex-wrap">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                {t.label}
                <span className="rounded-full bg-muted px-1.5 text-xs font-semibold text-muted-foreground">
                  {countFor(t.id)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <div className="relative w-full sm:w-56">
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
                className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
            <Button onClick={onCreate} size="sm">
              <Plus className="size-4" /> Add property
            </Button>
          </div>
        </div>
      </Tabs>

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
              <TableHead>Property</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Beds</TableHead>
              <TableHead className="text-right">Baths</TableHead>
              <TableHead className="hidden md:table-cell">Neighborhood</TableHead>
              <TableHead className="hidden lg:table-cell">Offer deadline</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No listings in this view.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} data-state={selected.has(p.id) ? 'selected' : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${p.address}`}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="size-4 cursor-pointer accent-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.photos[0]?.url || '/placeholder.svg'}
                        alt=""
                        className="size-9 shrink-0 rounded-md object-cover"
                      />
                      <span className="font-medium text-foreground">{p.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {p.type.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(p.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.beds}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {p.baths}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {p.neighborhood}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {p.offerDeadline ? formatDeadline(p.offerDeadline) : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu for {p.address}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(p.id)}
                        >
                          <Trash2 className="size-4" /> Delete
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

      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <p className="text-sm text-muted-foreground">
          Showing {rows.length} of {filtered.length}
          {selected.size > 0 && <span> · {selected.size} selected</span>}
        </p>
        <NumberedPagination page={safePage} pageCount={pageCount} onPage={setPage} />
      </div>
    </section>
  )
}
