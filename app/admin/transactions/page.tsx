'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminHeader, AdminMobileNav, AdminSidebar } from '@/components/admin/admin-nav'
import { TransactionsWorkspace } from '@/components/admin/transactions/transactions-workspace'
import { useStore } from '@/lib/store'

export default function AdminTransactionsPage() {
  const router = useRouter()
  const { ready, currentUser, logout } = useStore()

  // The proxy enforces admin + aal2 server-side and every API route re-checks
  // it; this only avoids a flash of content while the session resolves.
  useEffect(() => {
    if (ready && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/login')
    }
  }, [ready, currentUser, router])

  if (!ready || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-secondary">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh bg-white dark:bg-[#242424]">
      <AdminSidebar
        active="transactions"
        user={currentUser}
        onLogout={() => {
          logout()
          router.push('/')
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader title="Transactions" />
        <AdminMobileNav active="transactions" />
        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <TransactionsWorkspace />
          </div>
        </main>
      </div>
    </div>
  )
}