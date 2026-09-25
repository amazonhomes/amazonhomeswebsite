'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { BadgedPropertyCard } from '@/components/badged-property-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/lib/store'
import type { PropertyStatus, PropertyType } from '@/lib/types'

const types: (PropertyType | 'all')[] = [
  'all',
  'Single Family',
  'Multi Family',
  'Bungalow',
  'Colonial',
  'Ranch',
  'Tudor',
  'Fixer Upper',
]

const statuses: (PropertyStatus | 'all')[] = ['all', 'available', 'under-contract', 'sold']

function typeLabel(value: string) {
  return value === 'all' ? 'All Types' : value
}

function statusLabel(value: string) {
  if (value === 'all') return 'All Statuses'
  if (value === 'under-contract') return 'Under contract'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const sortLabels: Record<string, string> = {
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  spread: 'Biggest spread',
}

export default function PropertiesPage() {
  const { properties } = useStore()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('newest')

  const filtered = useMemo(() => {
    let list = properties.filter((p) => p.status !== 'archived')
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(
        (p) =>
          p.address.toLowerCase().includes(q) ||
          p.neighborhood.toLowerCase().includes(q) ||
          p.zip.includes(q),
      )
    }
    if (type !== 'all') list = list.filter((p) => p.type === type)
    if (status !== 'all') list = list.filter((p) => p.status === status)

    const min = Number(minPrice.replace(/[^0-9.]/g, ''))
    const max = Number(maxPrice.replace(/[^0-9.]/g, ''))
    if (min > 0) list = list.filter((p) => p.price >= min)
    if (max > 0) list = list.filter((p) => p.price <= max)

    switch (sort) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list = [...list].sort((a, b) => b.price - a.price)
        break
      case 'spread':
        list = [...list].sort(
          (a, b) =>
            b.arv - b.price - b.estimatedRehab - (a.arv - a.price - a.estimatedRehab),
        )
        break
      default:
        list = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
    }
    return list
  }, [properties, query, type, status, minPrice, maxPrice, sort])

  const activeFilterCount =
    (query.trim() !== '' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (minPrice !== '' ? 1 : 0) +
    (maxPrice !== '' ? 1 : 0)

  const hasFilters = activeFilterCount > 0 || sort !== 'newest'

  function resetFilters() {
    setQuery('')
    setType('all')
    setStatus('all')
    setMinPrice('')
    setMaxPrice('')
    setSort('newest')
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            Available properties
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Detroit off-market deals with transparent numbers. Register to unlock
            interior photos and full financials.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="property-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address, neighborhood, or ZIP"
              aria-label="Search address, neighborhood, or ZIP"
              className="h-11 w-full pl-9 text-base"
            />
          </div>

          {/* Dropdowns */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filter-type"
                className="text-xs font-medium text-muted-foreground"
              >
                Property Type
              </label>
              <Select value={type} onValueChange={(v) => setType(v ?? 'all')}>
                <SelectTrigger id="filter-type" className="h-11 w-full">
                  <SelectValue placeholder="All Types">
                    {(value: string) => typeLabel(value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'all' ? 'All Types' : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filter-status"
                className="text-xs font-medium text-muted-foreground"
              >
                Status
              </label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
                <SelectTrigger id="filter-status" className="h-11 w-full">
                  <SelectValue placeholder="All Statuses">
                    {(value: string) => statusLabel(value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'all'
                        ? 'All Statuses'
                        : s === 'under-contract'
                          ? 'Under contract'
                          : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
              <label
                htmlFor="filter-sort"
                className="text-xs font-medium text-muted-foreground"
              >
                Sort By
              </label>
              <Select value={sort} onValueChange={(v) => setSort(v ?? 'newest')}>
                <SelectTrigger id="filter-sort" className="h-11 w-full">
                  <SelectValue placeholder="Newest">
                    {(value: string) => sortLabels[value] ?? 'Newest'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="spread">Biggest spread</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price range + clear */}
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Price Range
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    inputMode="numeric"
                    placeholder="Min Price"
                    aria-label="Minimum price"
                    className="h-11 w-full pl-7 sm:w-36"
                  />
                </div>
                <span className="shrink-0 text-muted-foreground">–</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    inputMode="numeric"
                    placeholder="Max Price"
                    aria-label="Maximum price"
                    className="h-11 w-full pl-7 sm:w-36"
                  />
                </div>
              </div>
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-11 self-start text-muted-foreground sm:self-auto"
              >
                <X className="size-4" /> Clear Filters
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
          </p>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <SlidersHorizontal className="size-3" />
              Filters · {activeFilterCount}
            </span>
          )}
        </div>

        {filtered.length > 0 ? (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => (
              <BadgedPropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-md border border-dashed border-border p-12 text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              No properties match your filters
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your search or clearing filters.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  )
}
