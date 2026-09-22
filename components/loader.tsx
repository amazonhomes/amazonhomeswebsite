import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  label?: string
  className?: string
  fullscreen?: boolean
}

export function Loader({ label = 'Loading', className, fullscreen }: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-4',
        fullscreen ? 'min-h-dvh' : 'py-24',
        className,
      )}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {label}
        <span className="loader-dots" aria-hidden="true" />
      </p>
      <span className="sr-only">{label}</span>
    </div>
  )
}
