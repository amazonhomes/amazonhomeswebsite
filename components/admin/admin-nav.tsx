'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  LayoutGrid,
  LineChart,
  LogOut,
  Mail,
  MessageSquareQuote,
  PanelLeft,
  Plus,
  ScrollText,
  UserCog,
  Users,
} from 'lucide-react'
import { NotificationBell, type Notification } from '@/components/admin/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/format'
import type { Inquiry, Offer, Property, ShowingRequest } from '@/lib/types'

/** In-page sections owned by the admin dashboard route (`/admin`). */
export type Section =
  | 'overview'
  | 'properties'
  | 'offers'
  | 'showings'
  | 'messages'
  | 'investors'
  | 'testimonials'
  | 'audit'

/** Every selectable nav target, including account management (its own route). */
export type AdminNavId = Section | 'accounts'

type SectionNavItem = { kind: 'section'; id: Section; label: string; icon: typeof LayoutGrid }
type RouteNavItem = {
  kind: 'route'
  id: AdminNavId
  href: string
  label: string
  icon: typeof LayoutGrid
}
type NavItem = SectionNavItem | RouteNavItem

/** Primary workspace navigation. "Accounts" lives here (a real route) directly
 *  under "Investors"; every other item switches an in-page dashboard section. */
export const WORKSPACE_NAV: NavItem[] = [
  { kind: 'section', id: 'overview', label: 'Dashboard', icon: LayoutGrid },
  { kind: 'section', id: 'properties', label: 'Properties', icon: Building2 },
  { kind: 'section', id: 'offers', label: 'Offers', icon: LineChart },
  { kind: 'section', id: 'showings', label: 'Showings', icon: CalendarDays },
  { kind: 'section', id: 'messages', label: 'Messages', icon: Mail },
  { kind: 'section', id: 'investors', label: 'Investors', icon: Users },
  { kind: 'route', id: 'accounts', href: '/admin/users', label: 'Accounts', icon: UserCog },
]

export const CONTENT_NAV: NavItem[] = [
  { kind: 'section', id: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { kind: 'section', id: 'audit', label: 'Audit log', icon: ScrollText },
]

const ALL_NAV: NavItem[] = [...WORKSPACE_NAV, ...CONTENT_NAV]

export type NavBadges = { offers?: number; showings?: number; messages?: number }

/** Label shown in the header for the active nav target. */
export function navLabel(active: AdminNavId): string {
  return ALL_NAV.find((n) => n.id === active)?.label ?? ''
}

/** Section a dashboard notification should open when selected. */
export function notificationSection(kind: Notification['kind']): Section {
  if (kind === 'offer') return 'offers'
  if (kind === 'inquiry') return 'messages'
  return 'showings'
}

/** Builds the admin notification feed from live store data. Shared so every
 *  admin surface shows the identical bell contents. */
export function buildAdminNotifications(
  offers: Offer[],
  showings: ShowingRequest[],
  inquiries: Inquiry[],
  properties: Property[],
): Notification[] {
  const propertyMap = Object.fromEntries(properties.map((p) => [p.id, p]))
  return [
    ...offers
      .filter((o) => o.status === 'new')
      .map<Notification>((o) => ({
        id: `offer-${o.id}`,
        kind: 'offer',
        title: `New offer · ${formatCurrency(o.amount)}`,
        detail: `${o.name} on ${propertyMap[o.propertyId]?.address ?? 'a property'}`,
        createdAt: o.createdAt,
      })),
    ...showings
      .filter((s) => s.status === 'new')
      .map<Notification>((s) => ({
        id: `showing-${s.id}`,
        kind: 'showing',
        title: 'New showing request',
        detail: `${s.name} · ${propertyMap[s.propertyId]?.address ?? 'a property'}`,
        createdAt: s.createdAt,
      })),
    ...inquiries
      .filter((i) => i.status === 'new')
      .map<Notification>((i) => ({
        id: `inquiry-${i.id}`,
        kind: 'inquiry',
        title: 'New inquiry',
        detail: `${i.name}: ${i.message}`,
        createdAt: i.createdAt,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

function sectionHref(id: Section): string {
  return id === 'overview' ? '/admin' : `/admin?section=${id}`
}

function badgeFor(item: NavItem, badges?: NavBadges): number | undefined {
  if (item.kind !== 'section' || !badges) return undefined
  const value =
    item.id === 'offers'
      ? badges.offers
      : item.id === 'showings'
        ? badges.showings
        : item.id === 'messages'
          ? badges.messages
          : undefined
  return value && value > 0 ? value : undefined
}

const rowClass = (active: boolean) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    active
      ? 'bg-secondary text-foreground'
      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
  }`

interface AdminSidebarProps {
  active: AdminNavId
  user: { name: string; email: string }
  onLogout: () => void
  badges?: NavBadges
  /** Provided by the dashboard so section items switch in-page instead of
   *  navigating. Omitted on other routes, where items become links. */
  onSelectSection?: (section: Section) => void
  /** Provided by the dashboard to open the property creator inline. Omitted
   *  elsewhere, where Quick create links back to the dashboard. */
  onQuickCreate?: () => void
}

/** Shared desktop sidebar for every admin surface — single source of truth for
 *  admin navigation, quick create, and the profile/logout footer. */
export function AdminSidebar({
  active,
  user,
  onLogout,
  badges,
  onSelectSection,
  onQuickCreate,
}: AdminSidebarProps) {
  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = active === item.id
    const badge = badgeFor(item, badges)
    const inner = (
      <>
        <Icon className="size-4" />
        <span className="flex-1 text-left">{item.label}</span>
        {badge !== undefined && (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
            {badge}
          </span>
        )}
      </>
    )

    if (item.kind === 'route') {
      return (
        <Link
          key={item.id}
          href={item.href}
          className={rowClass(isActive)}
          aria-current={isActive ? 'page' : undefined}
        >
          {inner}
        </Link>
      )
    }

    if (onSelectSection) {
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelectSection(item.id)}
          className={rowClass(isActive)}
          aria-current={isActive ? 'page' : undefined}
        >
          {inner}
        </button>
      )
    }

    return (
      <Link
        key={item.id}
        href={sectionHref(item.id)}
        className={rowClass(isActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        {inner}
      </Link>
    )
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-display text-sm font-bold tracking-tight text-foreground">
            Motor City
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Investor Exchange
          </p>
        </div>
      </div>

      <div className="px-3 pb-2">
        {onQuickCreate ? (
          <Button onClick={onQuickCreate} className="w-full justify-start">
            <Plus className="size-4" /> Quick create
          </Button>
        ) : (
          <Button asChild className="w-full justify-start">
            <Link href="/admin?section=properties&create=1">
              <Plus className="size-4" /> Quick create
            </Link>
          </Button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {WORKSPACE_NAV.map(renderItem)}

        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          Content
        </p>
        {CONTENT_NAV.map(renderItem)}

        <Link
          href="/properties"
          className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Investor marketplace
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}

interface AdminMobileNavProps {
  active: AdminNavId
  onSelectSection?: (section: Section) => void
}

/** Horizontal pill switcher shown under the header below `lg`. Mirrors the
 *  desktop sidebar navigation so mobile stays consistent across admin routes. */
export function AdminMobileNav({ active, onSelectSection }: AdminMobileNavProps) {
  const pillClass = (isActive: boolean) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
      isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
    }`

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-card px-4 py-3 lg:hidden">
      {ALL_NAV.map((item) => {
        const isActive = active === item.id
        if (item.kind === 'route') {
          return (
            <Link key={item.id} href={item.href} className={pillClass(isActive)}>
              {item.label}
            </Link>
          )
        }
        if (onSelectSection) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={pillClass(isActive)}
            >
              {item.label}
            </button>
          )
        }
        return (
          <Link key={item.id} href={sectionHref(item.id)} className={pillClass(isActive)}>
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

interface AdminHeaderProps {
  title: string
  /** Optional: routes without a live notification feed (e.g. Accounts) omit
   *  these and the bell is hidden. The dashboard passes both to show it. */
  notifications?: Notification[]
  onSelectNotification?: (kind: Notification['kind']) => void
}

/** Shared top header: sidebar affordance, title, theme toggle, notifications,
 *  and the View site link. Identical across every admin surface. */
export function AdminHeader({ title, notifications, onSelectNotification }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur sm:px-8">
      <PanelLeft className="size-5 text-muted-foreground" aria-hidden />
      <span className="h-4 w-px bg-border" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {notifications && onSelectNotification && (
          <NotificationBell notifications={notifications} onSelect={onSelectNotification} />
        )}
        <Link
          href="/properties"
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View site
        </Link>
      </div>
    </header>
  )
}
