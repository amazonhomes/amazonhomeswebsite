'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  getValue,
  label = 'Copy',
  copiedLabel = 'Copied',
  toastMessage,
  icon,
  className,
  variant = 'outline',
  size = 'sm',
  iconOnly = false,
}: {
  /** Render a compact square button with the label available to screen readers and as a tooltip. */
  iconOnly?: boolean
  /** Static value to copy. Ignored when getValue is provided. */
  value?: string
  /** Lazily resolve the value at click time (e.g. current URL). */
  getValue?: () => string
  label?: string
  copiedLabel?: string
  toastMessage?: string
  icon?: React.ReactNode
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = getValue ? getValue() : (value ?? '')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(toastMessage ?? 'Copied to clipboard')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Unable to copy — please copy manually.')
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn('gap-2', iconOnly && 'size-8 p-0', className)}
      aria-label={copied ? copiedLabel : label}
      title={iconOnly ? (copied ? copiedLabel : label) : undefined}
    >
      {copied ? (
        <Check className="size-4 text-primary" />
      ) : (
        (icon ?? <Copy className="size-4" />)
      )}
      {iconOnly ? (
        <span className="sr-only">{copied ? copiedLabel : label}</span>
      ) : copied ? (
        copiedLabel
      ) : (
        label
      )}
    </Button>
  )
}
