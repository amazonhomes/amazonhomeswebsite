'use client'

import type { ReactNode } from 'react'
import { Loader } from '@/components/loader'
import { useStore } from '@/lib/store'

export function StoreGate({ children }: { children: ReactNode }) {
  const { ready } = useStore()

  if (!ready) {
    return <Loader label="Preparing your marketplace" className="flex-1" />
  }

  return <>{children}</>
}
