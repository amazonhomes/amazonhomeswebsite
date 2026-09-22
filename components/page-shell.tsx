import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import {
  CookieBanner,
  FloatingActions,
  ScrollProgress,
  SkipToContent,
} from '@/components/site-chrome'
import { StoreGate } from '@/components/store-gate'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipToContent />
      <ScrollProgress />
      <SiteHeader />
      <main id="main-content" className="flex flex-1 flex-col">
        <StoreGate>{children}</StoreGate>
      </main>
      <SiteFooter />
      <FloatingActions />
      <CookieBanner />
    </div>
  )
}
