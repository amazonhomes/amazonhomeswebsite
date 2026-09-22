'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import type { Testimonial } from '@/lib/types'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 5000

function usePerView() {
  const [perView, setPerView] = useState(3)

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth
      if (w < 640) setPerView(1)
      else if (w < 1024) setPerView(2)
      else setPerView(3)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  return perView
}

export function TestimonialsCarousel({ items }: { items: Testimonial[] }) {
  const perView = usePerView()
  const [page, setPage] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = items.length
  const pageCount = Math.max(1, Math.ceil(count / perView))

  const go = useCallback(
    (next: number) => setPage(((next % pageCount) + pageCount) % pageCount),
    [pageCount],
  )

  useEffect(() => {
    if (page > pageCount - 1) setPage(0)
  }, [page, pageCount])

  useEffect(() => {
    if (pageCount <= 1 || paused) return
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const timer = setInterval(() => setPage((p) => (p + 1) % pageCount), AUTOPLAY_MS)
    return () => clearInterval(timer)
  }, [pageCount, paused])

  if (count === 0) return null

  return (
    <div
      className="relative mt-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Investor testimonials"
    >
      <div className="overflow-hidden">
        <div
          className="flex items-start transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {Array.from({ length: pageCount }).map((_, p) => (
            <div
              key={p}
              className="grid min-w-full gap-6 px-1"
              style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}
            >
              {items.slice(p * perView, p * perView + perView).map((t) => (
                <figure
                  key={t.id}
                  className="flex h-80 flex-col rounded-xl border border-border bg-card p-6 text-left shadow-sm"
                >
                  <Quote className="size-8 shrink-0 text-primary" />
                  <div className="mt-4 flex shrink-0 gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 overflow-y-auto text-pretty leading-relaxed text-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 border-t border-border pt-4">
                    <p className="font-display font-semibold text-foreground">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(page - 1)}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
            aria-label="Previous testimonials"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === page}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === page ? 'w-6 bg-primary' : 'w-2 bg-border hover:bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(page + 1)}
            className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary"
            aria-label="Next testimonials"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  )
}
