'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  HelpCircle,
  LayoutGrid,
  LineChart,
  LogOut,
  Mail,
  MessageSquareQuote,
  PanelLeft,
  Plus,
  Route,
  ScrollText,
  UserCog,
  Users,
} from 'lucide-react'
import { NotificationBell, type Notification } from '@/components/admin/notification-bell'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleAdminSidebar, useAdminSidebarCollapsed } from '@/lib/admin-sidebar-store'
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
export type AdminNavId = Section | 'accounts' | 'transactions'

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
  {
    kind: 'route',
    id: 'transactions',
    href: '/admin/transactions',
    label: 'Transactions',
    icon: BriefcaseBusiness,
  },
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

const rowClass = (active: boolean, collapsed = false) =>
  `relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors ${
    collapsed ? 'justify-center px-0' : 'px-3'
  } ${
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
  const collapsed = useAdminSidebarCollapsed()

  const renderItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = active === item.id
    const badge = badgeFor(item, badges)
    const inner = (
      <>
        <Icon className="size-4 shrink-0" />
        <span className={collapsed ? 'sr-only' : 'flex-1 text-left'}>{item.label}</span>
        {badge !== undefined &&
          (collapsed ? (
            <span className="absolute right-2 top-1.5 size-2 rounded-full bg-accent" aria-hidden />
          ) : (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
              {badge}
            </span>
          ))}
      </>
    )
    const common = {
      'data-tour': item.id,
      className: rowClass(isActive, collapsed),
      'aria-current': isActive ? ('page' as const) : undefined,
      title: collapsed ? item.label : undefined,
    }

    if (item.kind === 'route') {
      return (
        <Link key={item.id} href={item.href} {...common}>
          {inner}
        </Link>
      )
    }

    if (onSelectSection) {
      return (
        <button key={item.id} type="button" onClick={() => onSelectSection(item.id)} {...common}>
          {inner}
        </button>
      )
    }

    return (
      <Link key={item.id} href={sectionHref(item.id)} {...common}>
        {inner}
      </Link>
    )
  }

  return (
    <aside
      id="admin-sidebar"
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className={`flex items-center gap-2.5 py-5 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
        
          <img
            src="/logo1.png"
            alt="Amazon Homes"
            className="size-9 rounded-sm object-contain"
          />
        
        <div className={collapsed ? 'sr-only' : 'leading-tight'}>
          <p className="font-display text-sm font-bold tracking-tight text-foreground">
            Amazon Homes
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Metro Detroit Investment Deals
          </p>
        </div>
      </div>

      <div className="px-3 pb-2">
        {onQuickCreate ? (
          <Button
            onClick={onQuickCreate}
            data-tour="quick-create"
            title={collapsed ? 'Quick create' : undefined}
            className={collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}
          >
            <Plus className="size-4" />
            <span className={collapsed ? 'sr-only' : undefined}>Quick create</span>
          </Button>
        ) : (
          <Button
            asChild
            data-tour="quick-create"
            className={collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}
          >
            <Link
              href="/admin?section=properties&create=1"
              title={collapsed ? 'Quick create' : undefined}
            >
              <Plus className="size-4" />
              <span className={collapsed ? 'sr-only' : undefined}>Quick create</span>
            </Link>
          </Button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {WORKSPACE_NAV.map(renderItem)}

        {collapsed ? (
          <span className="mx-2 my-3 h-px bg-border" aria-hidden />
        ) : (
          <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Content
          </p>
        )}
        {CONTENT_NAV.map(renderItem)}

        <Link
          href="/properties"
          title={collapsed ? 'Investor marketplace' : undefined}
          className={`mt-1 flex items-center gap-3 rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground ${
            collapsed ? 'justify-center px-0' : 'px-3'
          }`}
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className={collapsed ? 'sr-only' : undefined}>Investor marketplace</span>
        </Link>
      </nav>

      <div className="border-t border-border p-3">
        <div
          className={`flex items-center gap-3 rounded-md py-2 ${
            collapsed ? 'flex-col px-0' : 'px-2'
          }`}
        >
          <span
            title={collapsed ? `${user.name} (${user.email})` : undefined}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground"
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1 leading-tight'}>
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
            <Link key={item.id} href={item.href} data-tour={item.id} className={pillClass(isActive)}>
              {item.label}
            </Link>
          )
        }
        if (onSelectSection) {
          return (
            <button
              key={item.id}
              type="button"
              data-tour={item.id}
              onClick={() => onSelectSection(item.id)}
              className={pillClass(isActive)}
            >
              {item.label}
            </button>
          )
        }
        return (
          <Link
            key={item.id}
            href={sectionHref(item.id)}
            data-tour={item.id}
            className={pillClass(isActive)}
          >
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
  /** Provided by the dashboard so the Help menu can replay the admin tour.
   *  Omitted elsewhere, where the Help menu is hidden. */
  onStartTour?: () => void
}

/** Shared top header: sidebar affordance, title, theme toggle, notifications,
 *  Help menu, and the View site link. Identical across every admin surface. */
export function AdminHeader({
  title,
  notifications,
  onSelectNotification,
  onStartTour,
}: AdminHeaderProps) {
  const collapsed = useAdminSidebarCollapsed()

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur sm:px-8">
      <button
        type="button"
        onClick={toggleAdminSidebar}
        aria-controls="admin-sidebar"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="-ml-1.5 hidden size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex"
      >
        <PanelLeft className="size-5" aria-hidden />
      </button>
      <span className="hidden h-4 w-px bg-border lg:block" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {notifications && onSelectNotification && (
          <NotificationBell notifications={notifications} onSelect={onSelectNotification} />
        )}
        {onStartTour && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="size-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Help &amp; tutorials</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onStartTour()}>
                <Route className="size-4" />
                Take admin tour
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
