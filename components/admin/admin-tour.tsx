'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

/** A single tour step. `target` is a `data-tour` attribute value that points at
 *  a real element in the admin UI; when omitted (or when no matching element is
 *  currently visible) the step renders as a centered modal. `section` asks the
 *  dashboard to switch to that in-page section before the step is shown. */
export interface TourStep {
  id: string
  title: string
  body: string
  target?: string
}

interface AdminTourProps {
  open: boolean
  steps: TourStep[]
  /** Completed the whole tour (Finish). Should persist completion. */
  onFinish: () => void
  /** Closed without finishing and asked not to be auto-shown again. Persist. */
  onDismissPermanently: () => void
  /** Closed for now (Escape / Skip → "Skip for now"). Do NOT persist. */
  onSkipForNow: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 8
const TOOLTIP_WIDTH = 340
const GAP = 14

/** Finds the visible element for a `data-tour` value. Both the desktop sidebar
 *  and the mobile pill nav render the same `data-tour` targets; only one is
 *  visible at a time, so we pick the first with a layout box. */
function findTarget(target: string | undefined): HTMLElement | null {
  if (!target) return null
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`),
  )
  return nodes.find((el) => el.offsetParent !== null || el.getClientRects().length > 0) ?? null
}

export function AdminTour({
  open,
  steps,
  onFinish,
  onDismissPermanently,
  onSkipForNow,
}: AdminTourProps) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [showSkipChoice, setShowSkipChoice] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const total = steps.length
  const step = steps[index]
  const isFirst = index === 0
  const isLast = index === total - 1

  // Reset to the first step whenever the tour (re)opens.
  useEffect(() => {
    if (open) {
      setIndex(0)
      setShowSkipChoice(false)
    }
  }, [open])

  // Measure the current target (if any). Falls back to a centered modal when the
  // target is missing/hidden, so a changed layout never crashes the tour.
  const measure = useCallback(() => {
    if (!open || !step) return
    const el = findTarget(step.target)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
      setRect(null)
      return
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [open, step])

  // Bring the target into view, then measure across a few frames so smooth
  // scrolling settles before we position the spotlight.
  useLayoutEffect(() => {
    if (!open || !step) return
    const el = findTarget(step.target)
    el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })

    let frames = 0
    let raf = 0
    const tick = () => {
      measure()
      frames += 1
      if (frames < 8) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const timeout = window.setTimeout(measure, 320)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timeout)
    }
  }, [open, step, measure])

  // Keep the spotlight aligned during resize/scroll while the tour is open.
  useEffect(() => {
    if (!open) return
    const handler = () => measure()
    window.addEventListener('resize', handler)
    window.addEventListener('scroll', handler, true)
    return () => {
      window.removeEventListener('resize', handler)
      window.removeEventListener('scroll', handler, true)
    }
  }, [open, measure])

  // Move focus to the tour card on each step for keyboard/screen-reader users.
  useEffect(() => {
    if (open && !showSkipChoice) cardRef.current?.focus()
  }, [open, index, showSkipChoice])

  const goNext = useCallback(() => {
    if (isLast) onFinish()
    else setIndex((i) => Math.min(i + 1, total - 1))
  }, [isLast, onFinish, total])

  const goBack = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])

  // Keyboard navigation + focus trap within the card.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (showSkipChoice) setShowSkipChoice(false)
        else setShowSkipChoice(true)
        return
      }
      if (showSkipChoice) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (!isFirst) goBack()
      } else if (e.key === 'Tab') {
        // Simple focus trap: keep Tab cycling inside the card.
        const focusables = cardRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])',
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, showSkipChoice, goNext, goBack, isFirst])

  if (!open || !step) return null

  const titleId = 'admin-tour-title'
  const bodyId = 'admin-tour-body'

  // Compute tooltip position: centered when there's no target, otherwise below
  // the target when there's room, else above; always clamped into the viewport.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const tooltipWidth = Math.min(TOOLTIP_WIDTH, vw - 24)

  let cardStyle: React.CSSProperties
  if (!rect) {
    cardStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: tooltipWidth,
    }
  } else {
    const spaceBelow = vh - (rect.top + rect.height)
    const placeBelow = spaceBelow > 220 || spaceBelow > rect.top
    const top = placeBelow
      ? Math.min(rect.top + rect.height + GAP, vh - 24)
      : Math.max(rect.top - GAP, 24)
    let left = rect.left + rect.width / 2 - tooltipWidth / 2
    left = Math.max(12, Math.min(left, vw - tooltipWidth - 12))
    cardStyle = {
      top,
      left,
      width: tooltipWidth,
      transform: placeBelow ? undefined : 'translateY(-100%)',
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      {/* Dim + spotlight. With a target we use a big box-shadow ring so the
          target stays visible and un-clickable; without one we dim fully. */}
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-200"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.55)',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-slate-950/55" />
      )}

      {showSkipChoice ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="admin-tour-skip-title"
          className="absolute left-1/2 top-1/2 w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl"
        >
          <h2
            id="admin-tour-skip-title"
            className="font-display text-base font-bold text-foreground"
          >
            Skip the tour?
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You can always restart it from Help → Take admin tour.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button onClick={onDismissPermanently}>Don&apos;t show automatically again</Button>
            <Button variant="outline" onClick={onSkipForNow}>
              Skip for now
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowSkipChoice(false)}
              className="text-muted-foreground"
            >
              Keep touring
            </Button>
          </div>
        </div>
      ) : (
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className="absolute rounded-xl border border-border bg-card p-5 shadow-2xl outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
          style={cardStyle}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            {index + 1} of {total}
          </p>
          <h2 id={titleId} className="mt-1.5 font-display text-lg font-bold text-foreground">
            {step.title}
          </h2>
          <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>

          {/* Progress dots */}
          <div className="mt-4 flex items-center gap-1" aria-hidden>
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border'
                }`}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSkipChoice(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              {isFirst ? 'Skip' : 'Skip tour'}
            </Button>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={goBack}>
                  Back
                </Button>
              )}
              <Button size="sm" onClick={goNext}>
                {isFirst ? 'Start tour' : isLast ? 'Finish tour' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
