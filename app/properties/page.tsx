'use client'

import { useMemo, useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { PropertyCard } from '@/components/property-card'
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

  const hasFilters =
    query.trim() !== '' ||
    type !== 'all' ||
    status !== 'all' ||
    minPrice !== '' ||
    maxPrice !== '' ||
    sort !== 'newest'

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
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search address, neighborhood, or ZIP"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
              <Select value={type} onValueChange={(v) => setType(v ?? 'all')}>
                <SelectTrigger className="lg:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === 'all' ? 'All types' : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v ?? 'all')}>
                <SelectTrigger className="lg:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'all'
                        ? 'All statuses'
                        : s === 'under-contract'
                          ? 'Under contract'
                          : s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v ?? 'newest')}>
                <SelectTrigger className="col-span-2 sm:col-span-1 lg:w-44">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: low to high</SelectItem>
                  <SelectItem value="price-desc">Price: high to low</SelectItem>
                  <SelectItem value="spread">Biggest spread</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm font-medium text-muted-foreground">
                Price range
              </span>
              <Input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                inputMode="numeric"
                placeholder="Min"
                aria-label="Minimum price"
                className="w-24 sm:w-28"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                inputMode="numeric"
                placeholder="Max"
                aria-label="Maximum price"
                className="w-24 sm:w-28"
              />
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-muted-foreground sm:ml-auto"
              >
                <X className="size-4" /> Clear filters
              </Button>
            )}
          </div>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'property' : 'properties'} found
        </p>

        {filtered.length > 0 ? (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((property) => (
              <PropertyCard key={property.id} property={property} />
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
