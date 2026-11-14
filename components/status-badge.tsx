import { BadgeDollarSign, CircleCheck, Clock3, HousePlus, Pen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PropertyStatus } from '@/lib/types'

export const STATUS_BADGE_ICONS = {
  newListing: HousePlus,
  active: CircleCheck,
  pending: Clock3,
  sold: BadgeDollarSign,
  draft: Pen,
} as const

export const STATUS_BADGE_CLASSES = {
  newListing: 'bg-[#0b1f3a] text-white',
  active: 'bg-green-600 text-white',
  pending: 'bg-yellow-400 text-yellow-950',
  sold: 'bg-red-600 text-white',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
} as const

const config: Record<PropertyStatus, { label: string; className: string; icon?: LucideIcon }> = {
  draft: {
    label: 'Draft',
    className: STATUS_BADGE_CLASSES.active,
    icon: Pen,
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
  publicationStatus,
  className,
}: {
  status: PropertyStatus
  publicationStatus?: 'draft' | 'published'
  className?: string
}) {
  const { label, className: statusClass, icon: Icon } =
    publicationStatus === 'draft'
      ? { label: 'Draft', className: STATUS_BADGE_CLASSES.draft, icon: Pen }
      : config[status]
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
