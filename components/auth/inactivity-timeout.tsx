'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Client-side inactivity enforcement. The real security boundary stays the
// Supabase session + server/RLS authorization; this only improves UX by
// signing an idle user out and clearing local session state.
//
// Idle windows are role-differentiated: admin/VA sessions are the higher-value
// target so they expire sooner. A fixed 2-minute warning precedes each logout.
const ADMIN_IDLE_TIMEOUT_MS = 20 * 60 * 1000 // admin/VA: hard logout at 20 min idle
const INVESTOR_IDLE_TIMEOUT_MS = 30 * 60 * 1000 // investor/other: hard logout at 30 min idle
const WARN_WINDOW_MS = 2 * 60 * 1000 // show the warning modal 2 min before logout

function idleTimeoutForRole(role: string | undefined) {
  return role === 'admin' ? ADMIN_IDLE_TIMEOUT_MS : INVESTOR_IDLE_TIMEOUT_MS
}

// localStorage keys hold only timestamps / signals — never credentials or
// session tokens — so multiple tabs can share activity and logout state.
const ACTIVITY_KEY = 'ah:last-activity'
const LOGOUT_KEY = 'ah:inactivity-logout'

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'wheel',
  'click',
] as const

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function InactivityTimeout() {
  const { currentUser, logout } = useStore()
  const pathname = usePathname()
  const [showWarning, setShowWarning] = useState(false)
  const [remaining, setRemaining] = useState(WARN_WINDOW_MS)

  const isAuthed = !!currentUser

  // Idle limit tracks the current user's role and is read from a ref inside the
  // interval so a role change (login/logout) is picked up without re-arming.
  const idleTimeoutMs = idleTimeoutForRole(currentUser?.role)
  const idleTimeoutRef = useRef(idleTimeoutMs)
  useEffect(() => {
    idleTimeoutRef.current = idleTimeoutMs
  }, [idleTimeoutMs])

  const lastActivityRef = useRef<number>(Date.now())
  const lastWriteRef = useRef<number>(0)
  const warningRef = useRef(false)
  const loggingOutRef = useRef(false)

  useEffect(() => {
    warningRef.current = showWarning
  }, [showWarning])

  const writeStored = useCallback((ts: number) => {
    try {
      localStorage.setItem(ACTIVITY_KEY, String(ts))
    } catch {
      // storage may be unavailable (private mode); timers still work in-memory
    }
  }, [])

  // Full reset: explicit interactions (Stay Logged In, navigation, cross-tab
  // activity). Always clears the warning and refreshes the shared timestamp.
  const resetTimer = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    lastWriteRef.current = now
    writeStored(now)
    setShowWarning(false)
  }, [writeStored])

  // Passive activity (mouse/keyboard/scroll/touch). Ignored while the warning
  // is open so the modal stays until the user explicitly chooses an action.
  const markActivity = useCallback(() => {
    if (warningRef.current) return
    const now = Date.now()
    lastActivityRef.current = now
    if (now - lastWriteRef.current > 1000) {
      lastWriteRef.current = now
      writeStored(now)
    }
  }, [writeStored])

  const doLogout = useCallback(
    async (broadcast: boolean) => {
      if (loggingOutRef.current) return
      loggingOutRef.current = true
      if (broadcast) {
        try {
          localStorage.setItem(LOGOUT_KEY, String(Date.now()))
        } catch {
          // ignore — best-effort cross-tab signal
        }
      }
      try {
        await logout()
      } catch {
        // still redirect even if the network sign-out call fails
      }
      try {
        localStorage.removeItem(ACTIVITY_KEY)
      } catch {
        // ignore
      }
      // No session data in the URL — just a benign reason flag.
      window.location.assign('/login?timeout=1')
    },
    [logout],
  )

  // Activity + cross-tab listeners. Attached regardless of auth state so that
  // interactions on public pages (e.g. the login form) keep the shared
  // timestamp fresh — that prevents a false "expired" logout right after login.
  useEffect(() => {
    let stored: number | null = null
    try {
      const raw = localStorage.getItem(ACTIVITY_KEY)
      if (raw) {
        const n = Number(raw)
        if (Number.isFinite(n)) stored = n
      }
    } catch {
      stored = null
    }
    if (stored != null) {
      lastActivityRef.current = stored
    } else {
      lastActivityRef.current = Date.now()
      writeStored(lastActivityRef.current)
    }

    const onActivity = () => markActivity()
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true }),
    )

    const onStorage = (ev: StorageEvent) => {
      if (ev.key === ACTIVITY_KEY && ev.newValue) {
        const n = Number(ev.newValue)
        if (Number.isFinite(n) && n > lastActivityRef.current) {
          lastActivityRef.current = n
          setShowWarning(false)
        }
      }
      if (ev.key === LOGOUT_KEY && ev.newValue) {
        // Another tab logged this user out for inactivity — follow suit.
        void doLogout(false)
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, onActivity),
      )
      window.removeEventListener('storage', onStorage)
    }
  }, [markActivity, writeStored, doLogout])

  // In-app navigation counts as an explicit interaction.
  useEffect(() => {
    resetTimer()
  }, [pathname, resetTimer])

  // The expiry checker only runs while authenticated. It also re-checks on tab
  // focus / visibility so a backgrounded or reopened tab expires correctly.
  useEffect(() => {
    if (!isAuthed) {
      setShowWarning(false)
      loggingOutRef.current = false
      return
    }

    const check = () => {
      if (loggingOutRef.current) return
      const idle = idleTimeoutRef.current
      const warnAfter = idle - WARN_WINDOW_MS
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= idle) {
        void doLogout(true)
      } else if (elapsed >= warnAfter) {
        setShowWarning(true)
        setRemaining(idle - elapsed)
      } else {
        setShowWarning(false)
      }
    }

    check()
    const id = window.setInterval(check, 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [isAuthed, doLogout])

  if (!isAuthed) return null

  return (
    <Dialog
      open={showWarning}
      onOpenChange={(open) => {
        // Dismissing the modal (X / Escape / outside click) keeps the session.
        if (!open) resetTimer()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your session is about to expire</DialogTitle>
          <DialogDescription>
            You&apos;ve been inactive for a while. For your security, you&apos;ll
            be logged out soon unless you choose to stay signed in.
          </DialogDescription>
        </DialogHeader>
        <p
          className="text-sm text-muted-foreground"
          role="timer"
          aria-live="polite"
        >
          Logging out in{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatRemaining(remaining)}
          </span>
          .
        </p>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => void doLogout(true)}>
            Log Out
          </Button>
          <Button onClick={resetTimer}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
