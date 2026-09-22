import { cn } from '@/lib/utils'
import type { PropertyStatus } from '@/lib/types'

const config: Record<PropertyStatus, { label: string; className: string }> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  'under-contract': {
    label: 'Under Contract',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  },
  sold: {
    label: 'Sold',
    className: 'bg-muted text-muted-foreground',
  },
  archived: {
    label: 'Archived',
    className: 'bg-muted text-muted-foreground',
  },
}

export function StatusBadge({
  status,
  className,
}: {
  status: PropertyStatus
  className?: string
}) {
  const { label, className: statusClass } = config[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide font-display',
        statusClass,
        className,
      )}
    >
      {label}
    </span>
  )
}
