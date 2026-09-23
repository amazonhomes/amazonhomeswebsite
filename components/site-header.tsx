'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Bookmark, Building2, LayoutDashboard, LogOut, Menu, MessageSquare, User2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SiteSearch } from '@/components/site-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { useStore } from '@/lib/store'
import { useMessageNotifications } from '@/lib/use-message-notifications'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/', label: 'Home' },
  { href: '/properties', label: 'Properties' },
  { href: '/#faqs', label: 'FAQs' },
  { href: '/contact', label: 'Contact' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { currentUser, logout } = useStore()
  const { unreadCount } = useMessageNotifications()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Amazon Homes home">
          <img
            src="/logo1.png"
            alt="Amazon Homes"
            className="size-9 rounded-sm object-contain"
          />
          <span className="flex flex-col leading-none">
            <span className="font-display text-base font-bold tracking-tight text-foreground">
              Amazon Homes
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Metro Detroit Investment Deals
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-sm px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                pathname === item.href && 'text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative gap-2">
                  <User2 className="size-4" />
                  {currentUser.name.split(' ')[0]}
                  {unreadCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground"
                      aria-label={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="flex flex-col">
                  <span>{currentUser.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {currentUser.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentUser.role === 'admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin')}>
                    <LayoutDashboard className="size-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <MessageSquare className="size-4" />
                  My Messages
                  {unreadCount > 0 && (
                    <span className="ml-auto flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/saved')}>
                  <Bookmark className="size-4" />
                  Saved Properties
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/properties')}>
                  <Building2 className="size-4" />
                  Browse Properties
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    logout()
                    router.push('/')
                  }}
                >
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Get Access</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <SiteSearch triggerClassName="size-9 justify-center px-0" label="" />
          <ThemeToggle />
          <button
            className="inline-flex size-9 items-center justify-center rounded-sm border border-border text-foreground"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-sm px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                  pathname === item.href && 'bg-muted text-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {currentUser ? (
                <>
                  {currentUser.role === 'admin' && (
                    <Button variant="outline" asChild onClick={() => setOpen(false)}>
                      <Link href="/admin">Admin Dashboard</Link>
                    </Button>
                  )}
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link href="/account" className="relative">
                      My Messages
                      {unreadCount > 0 && (
                        <span className="ml-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-none text-primary-foreground">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link href="/saved">Saved Properties</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      logout()
                      setOpen(false)
                      router.push('/')
                    }}
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild onClick={() => setOpen(false)}>
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild onClick={() => setOpen(false)}>
                    <Link href="/register">Get Access</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
