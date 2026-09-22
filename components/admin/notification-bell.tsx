'use client'

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

const ICONS = {
  offer: LineChart,
  showing: CalendarDays,
  inquiry: MessageSquare,
} as const

export function NotificationBell({
  notifications,
  onSelect,
}: {
  notifications: Notification[]
  onSelect: (kind: Notification['kind']) => void
}) {
  const count = notifications.length

  return (
    <DropdownMenu>
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
        {count === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = ICONS[n.kind]
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onSelect(n.kind)}
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
