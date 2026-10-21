import { BadgeDollarSign, CircleCheck, Clock3, HousePlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyStatus } from '@/lib/types'

export const STATUS_BADGE_ICONS = {
  newListing: HousePlus,
  active: CircleCheck,
  pending: Clock3,
  sold: BadgeDollarSign,
} as const

export const STATUS_BADGE_CLASSES = {
  newListing: 'bg-[#1E3A5F] text-white',
  active: 'bg-green-600 text-white',
  pending: 'bg-yellow-400 text-yellow-950',
  sold: 'bg-red-600 text-white',
} as const

const config: Record<PropertyStatus, { label: string; className: string; icon?: LucideIcon }> = {
  draft: {
    label: 'Draft',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  },
  available: {
    label: 'Active',
    className: STATUS_BADGE_CLASSES.active,
    icon: CircleCheck,
  },
  'under-contract': {
    label: 'Pending',
    className: STATUS_BADGE_CLASSES.pending,
    icon: Clock3,
  },
  sold: {
    label: 'Sold',
    className: STATUS_BADGE_CLASSES.sold,
    icon: BadgeDollarSign,
  },
  archived: {
    label: 'Archived',
    className: 'bg-muted text-muted-foreground',
  },
}

export function propertyStatusLabel(status: PropertyStatus) {
  return config[status]?.label ?? status
}

export function StatusBadge({
  status,
  className,
}: {
  status: PropertyStatus
  className?: string
}) {
  const { label, className: statusClass, icon: Icon } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide font-display',
        statusClass,
        className,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
      {label}
    </span>
  )
}
