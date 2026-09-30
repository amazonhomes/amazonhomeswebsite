'use client'

import { useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import { Bell, CalendarDays, LineChart, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, timeAgo } from '@/lib/format'

export type Notification = {
  id: string
  kind: 'offer' | 'showing' | 'inquiry'
  title: string
  detail: string
  createdAt: string
}

type ReadReceipt = { notificationId: string; kind: Notification['kind'] }
type ReadsResponse = { reads: ReadReceipt[] }

const READS_KEY = '/api/admin/notifications/read'

const ICONS = {
  offer: LineChart,
  showing: CalendarDays,
  inquiry: MessageSquare,
} as const

const receiptKey = (kind: Notification['kind'], id: string) => `${kind}:${id}`

async function fetchReads(url: string): Promise<ReadsResponse> {
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to load read receipts (${res.status})`)
  return res.json()
}

export function NotificationBell({
  notifications,
  onSelect,
}: {
  notifications: Notification[]
  onSelect: (kind: Notification['kind']) => void
}) {
  const [open, setOpen] = useState(false)
  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(() => new Set())
  const inFlight = useRef<Set<string>>(new Set())

  const { data, error, isLoading, mutate } = useSWR<ReadsResponse>(READS_KEY, fetchReads, {
    revalidateOnFocus: true,
  })

  const unreadNotifications = useMemo(() => {
    // Hold the badge back until receipts load so already-read items don't flash
    // as unread. If receipts can't be loaded, fall back to showing everything.
    if (isLoading && !data) return []
    const read = new Set(optimisticRead)
    for (const r of data?.reads ?? []) read.add(receiptKey(r.kind, r.notificationId))
    return notifications.filter((n) => !read.has(receiptKey(n.kind, n.id)))
  }, [notifications, data, isLoading, optimisticRead])

  const count = unreadNotifications.length

  async function markRead(n: Notification) {
    const key = receiptKey(n.kind, n.id)
    if (inFlight.current.has(key)) return
    inFlight.current.add(key)

    try {
      const res = await fetch(READS_KEY, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: n.id, kind: n.kind }),
      })
      if (!res.ok) throw new Error(`Mark read failed (${res.status})`)
      await mutate(
        (current) => ({
          reads: [{ notificationId: n.id, kind: n.kind }, ...(current?.reads ?? [])],
        }),
        { revalidate: false },
      )
    } catch {
      setOptimisticRead((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      toast.error('Could not mark notification as read.')
    } finally {
      inFlight.current.delete(key)
    }
  }

  function handleSelect(n: Notification) {
    const key = receiptKey(n.kind, n.id)
    setOpen(false)
    if (!inFlight.current.has(key)) {
      setOptimisticRead((prev) => new Set(prev).add(key))
      void markRead(n)
    }
    onSelect(n.kind)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9"
          aria-label={
            count > 0 ? `${count} new notification${count === 1 ? '' : 's'}` : 'Notifications'
          }
        >
          <Bell className="size-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-[18px] text-primary-foreground">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          <span className="text-xs font-normal text-muted-foreground">{count} new</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {error && (
          <p className="px-2 pb-1 pt-2 text-xs text-muted-foreground">
            Read status unavailable. Showing all notifications.
          </p>
        )}
        {count === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {isLoading && !data ? 'Loading…' : 'You\u2019re all caught up.'}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {unreadNotifications.map((n) => {
              const Icon = ICONS[n.kind]
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleSelect(n)}
                  className="flex w-full items-start gap-3 px-2 py-2.5 text-left transition-colors hover:bg-secondary"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{n.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{n.detail}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Re-exported for convenience where offer amounts are formatted in notification details. */
export { formatCurrency }
