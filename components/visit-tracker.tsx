'use client'

import { useEffect } from 'react'

/**
 * Fires a single aggregate visit ping per browser session.
 *
 * A `sessionStorage` flag ensures we count roughly one visit per session rather
 * than once per page navigation or re-render. The request is fire-and-forget
 * with `keepalive` so it survives a fast navigation, and every failure is
 * swallowed — visit tracking must never affect the user's experience.
 *
 * This is NOT fetching data for render (the guidance that bans useEffect
 * fetching); it is an intentional analytics side-effect that writes a
 * server-side counter and reads nothing back.
 */
export function VisitTracker() {
  useEffect(() => {
    const KEY = 'v0-visit-tracked'
    try {
      if (sessionStorage.getItem(KEY)) return
      sessionStorage.setItem(KEY, '1')
    } catch {
      // Private mode / storage disabled — fall through and still ping once.
    }

    void fetch('/api/track-visit', {
      method: 'POST',
      keepalive: true,
    }).catch(() => {
      // Non-fatal: tracking is best-effort.
    })
  }, [])

  return null
}
