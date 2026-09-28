'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /**
   * Optional async action run when the user confirms. While it runs the dialog
   * stays open with a spinner and disabled buttons (no duplicate submits). It
   * closes when the action finishes; `confirm()` resolves with the action's
   * boolean result.
   */
  onConfirm?: () => Promise<boolean>
}

type PendingState = ConfirmOptions & {
  open: boolean
  resolve?: (value: boolean) => void
}

/**
 * Promise-based confirmation. Call `confirm(options)` and await the boolean
 * result, then render `dialog` somewhere in the component tree.
 */
export function useConfirm() {
  const [state, setState] = useState<PendingState>({ open: false, title: '' })
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve })
    })
  }, [])

  const settle = useCallback(
    (result: boolean) => {
      state.resolve?.(result)
      setState((prev) => ({ ...prev, open: false, resolve: undefined }))
    },
    [state],
  )

  const handleConfirm = useCallback(async () => {
    if (!state.onConfirm) {
      settle(true)
      return
    }
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    let result = false
    try {
      result = await state.onConfirm()
    } catch {
      result = false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
    settle(result)
  }, [state, settle])

  const dialog = (
    <Dialog open={state.open} onOpenChange={(open) => !open && !busyRef.current && settle(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {state.destructive && (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
            )}
            <DialogTitle>{state.title}</DialogTitle>
          </div>
          {state.description && (
            <DialogDescription className="pt-1">{state.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => settle(false)} disabled={busy}>
            {state.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={state.destructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {state.confirmLabel ?? 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { confirm, dialog }
}
