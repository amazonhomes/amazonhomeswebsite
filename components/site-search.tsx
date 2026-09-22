'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileText, Home, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

type PageResult = { kind: 'page'; label: string; href: string }

const PAGES: PageResult[] = [
  { kind: 'page', label: 'Home', href: '/' },
  { kind: 'page', label: 'All properties', href: '/properties' },
  { kind: 'page', label: 'How it works', href: '/how-it-works' },
  { kind: 'page', label: 'Contact', href: '/contact' },
  { kind: 'page', label: 'Join the buyers list', href: '/register' },
]

export function SiteSearch({
  triggerClassName,
  label = 'Search',
}: {
  triggerClassName?: string
  label?: string
}) {
  const router = useRouter()
  const { properties } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Global Cmd/Ctrl+K shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) setQuery('')
  }, [open])

  const q = query.trim().toLowerCase()

  const propertyResults = useMemo(() => {
    if (!q) return properties.filter((p) => p.status !== 'archived').slice(0, 5)
    return properties
      .filter((p) => p.status !== 'archived')
      .filter((p) =>
        [p.address, p.neighborhood, p.city, p.zip, p.type]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 6)
  }, [properties, q])

  const pageResults = useMemo(() => {
    if (!q) return PAGES
    return PAGES.filter((p) => p.label.toLowerCase().includes(q))
  }, [q])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  const hasResults = propertyResults.length > 0 || pageResults.length > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        className={cn(
          'inline-flex items-center gap-2 rounded-sm border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          triggerClassName,
        )}
      >
        <Search className="size-4" />
        <span className="hidden lg:inline">{label}</span>
        <kbd className="ml-1 hidden rounded border border-border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground lg:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search properties and pages across the site.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties, neighborhoods, pages…"
              className="w-full bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!hasResults && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;.
              </p>
            )}

            {propertyResults.length > 0 && (
              <div className="mb-1">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Properties
                </p>
                {propertyResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => go(`/properties/${p.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Home className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {p.address}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.neighborhood} · {formatCurrency(p.price)} · {p.type}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {pageResults.length > 0 && (
              <div>
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pages
                </p>
                {pageResults.map((p) => (
                  <button
                    key={p.href}
                    type="button"
                    onClick={() => go(p.href)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <FileText className="size-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {p.label}
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
