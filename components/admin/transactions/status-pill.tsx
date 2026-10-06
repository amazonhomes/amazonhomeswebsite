import { statusTone, type StatusTone } from '@/lib/transactions'
import { cn } from '@/lib/utils'

const TONE_CLASSES: Record<StatusTone, string> = {
  positive: 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  info: 'border-sky-600/25 bg-sky-600/10 text-sky-700 dark:text-sky-400',
  neutral: 'border-border bg-secondary text-muted-foreground',
}

export function StatusPill({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return <span className="text-sm text-muted-foreground">{'—'}</span>
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[statusTone(status)],
        className,
      )}
    >
      {status}
    </span>
  )
}