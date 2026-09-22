'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, Cookie, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Keyboard-first jump link that is visible only when focused. */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-2 focus:outline-offset-2 focus:outline-ring"
    >
      Skip to content
    </a>
  )
}

/** Thin progress bar tracking how far the page is scrolled. */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      setProgress(scrollable > 0 ? (el.scrollTop / scrollable) * 100 : 0)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent print:hidden"
      aria-hidden="true"
    >
      <div
        className="h-full origin-left bg-accent transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

/** Floating actions: contact shortcut plus a back-to-top button once scrolled. */
export function FloatingActions() {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 print:hidden">
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top"
        className={cn(
          'flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-all duration-300 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          showTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0',
        )}
      >
        <ArrowUp className="size-5" />
      </button>
      <Link
        href="/contact"
        aria-label="Contact us"
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MessageCircle className="size-6" />
      </Link>
    </div>
  )
}

const COOKIE_KEY = 'ah-cookie-consent'

/** Bottom-left cookie consent banner, persisted so it shows once. */
export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  const decide = (choice: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(COOKIE_KEY, choice)
    } catch {
      /* ignore storage failures */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-4 shadow-xl sm:left-4 sm:right-auto print:hidden"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Cookie className="size-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">We value your privacy</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We use cookies to improve your browsing experience and analyze site
            traffic. You can accept or decline non-essential cookies.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => decide('accepted')}>
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide('declined')}>
              Decline
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => decide('declined')}
          aria-label="Dismiss cookie banner"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
