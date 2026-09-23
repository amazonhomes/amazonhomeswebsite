'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CalendarDays,
  LayoutGrid,
  LineChart,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ActivityChart } from '@/components/admin/activity-chart'
import { useConfirm } from '@/components/confirm-dialog'
import {
  AdminHeader,
  AdminMobileNav,
  AdminSidebar,
  buildAdminNotifications,
  navLabel,
  type Section,
} from '@/components/admin/admin-nav'
import { AdminTour, type TourStep } from '@/components/admin/admin-tour'
import { DataTable, type Column } from '@/components/admin/data-table'
import { MessagesInbox } from '@/components/admin/messages-inbox'
import type { Notification } from '@/components/admin/notification-bell'
import { PropertiesTable } from '@/components/admin/properties-table'
import { PropertyEditor } from '@/components/admin/property-editor'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Inquiry, Offer, Property, ShowingRequest, User } from '@/lib/types'

const AUDIT_ACTION_STYLES: Record<string, string> = {
  INSERT: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
  UPDATE: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  DELETE: 'border-red-500/30 bg-red-500/10 text-red-600',
}

const SECTIONS: Section[] = [
  'overview',
  'properties',
  'offers',
  'showings',
  'messages',
  'investors',
  'testimonials',
  'audit',
]

/** Validates a `?section=` query value so cross-route links (e.g. from the
 *  Accounts page) can land on a specific dashboard section. */
function isSection(value: string | null): value is Section {
  return value !== null && (SECTIONS as string[]).includes(value)
}

const OFFER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
]
const OFFER_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

const SHOWING_TABS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
]
const SHOWING_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
]

const INQUIRY_STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'responded', label: 'Responded' },
]

/** Color-coded pill for offer / showing / inquiry statuses. */
const PILL_STYLES: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  responded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  declined: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
}

/** Percent change of items created in the last 7 days vs the prior 7 days. */
function trendPct(items: { createdAt: string }[]): number {
  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000
  const last = items.filter((i) => now - new Date(i.createdAt).getTime() <= week).length
  const prev = items.filter((i) => {
    const age = now - new Date(i.createdAt).getTime()
    return age > week && age <= 2 * week
  }).length
  if (prev === 0) return last > 0 ? 100 : 0
  return Math.round(((last - prev) / prev) * 1000) / 10
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Ordered onboarding steps for admins/VAs. Each `target` maps to a `data-tour`
 *  attribute rendered in the persistent sidebar / mobile nav, so the tour works
 *  from any section without route changes; targetless steps render centered. */
const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to your admin workspace',
    body: 'This quick tour points out where to manage listings, offers, showings, messages, and investor accounts. It takes less than a minute — you can skip or replay it anytime.',
  },
  {
    id: 'quick-create',
    title: 'Add a listing fast',
    body: 'Quick create opens the property editor from anywhere. Set the address, price, status, and offer deadline, then publish it to the marketplace.',
    target: 'quick-create',
  },
  {
    id: 'properties',
    title: 'Manage properties',
    body: 'The Properties tab is your full catalog — edit details, update status, set offer deadlines, or retire listings that are no longer available.',
    target: 'properties',
  },
  {
    id: 'offers',
    title: 'Review incoming offers',
    body: 'Offers land here with the investor, amount, and property. Move each one through New → Reviewed → Accepted or Declined, or message the investor directly.',
    target: 'offers',
  },
  {
    id: 'showings',
    title: 'Coordinate showings',
    body: 'Showing requests show the requester and preferred time. Confirm or schedule walkthroughs and mark them completed as you go.',
    target: 'showings',
  },
  {
    id: 'messages',
    title: 'Reply to investors',
    body: 'The Messages inbox threads every inquiry and lead conversation. Replies are delivered to the investor and show up in their account.',
    target: 'messages',
  },
  {
    id: 'investors',
    title: 'See who is active',
    body: 'The Investors tab lists registered accounts so you can track engagement and follow up with the right people.',
    target: 'investors',
  },
  {
    id: 'audit',
    title: 'Track every change',
    body: 'The Audit log records inserts, updates, and deletes across the marketplace — useful for accountability when a team shares the dashboard.',
    target: 'audit',
  },
  {
    id: 'finish',
    title: 'You are all set',
    body: 'That is the whole workspace. Need a refresher later? Open Help in the top bar and choose “Take admin tour” to replay this anytime.',
  },
]

function AdminDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    ready,
    currentUser,
    properties,
    users,
    offers,
    showings,
    inquiries,
    testimonials,
    auditLogs,
    logout,
    deleteProperty,
    updateOfferStatus,
    updateShowingStatus,
    updateInquiryStatus,
    replyToInquiry,
    startConversation,
    addTestimonial,
    deleteTestimonial,
    completeAdminTour,
  } = useStore()

  const { confirm, dialog: confirmDialog } = useConfirm()

  const [tourOpen, setTourOpen] = useState(false)
  // Ensures the tour auto-opens at most once per mount, so "Skip for now"
  // (which intentionally does not persist) won't reopen it on re-render.
  const tourAutoStarted = useRef(false)

  const confirmDeleteProperty = async (id: string) => {
    const property = properties.find((p) => p.id === id)
    if (
      await confirm({
        title: 'Delete this property?',
        description: property
          ? `“${property.address}” and its associated data will be permanently removed. This cannot be undone.`
          : 'This listing will be permanently removed. This cannot be undone.',
        confirmLabel: 'Delete property',
        destructive: true,
      })
    ) {
      deleteProperty(id)
    }
  }

  const confirmDeleteTestimonial = async (id: string) => {
    if (
      await confirm({
        title: 'Delete this testimonial?',
        description: 'This testimonial will be permanently removed. This cannot be undone.',
        confirmLabel: 'Delete testimonial',
        destructive: true,
      })
    ) {
      deleteTestimonial(id)
    }
  }

  const [section, setSection] = useState<Section>(() => {
    const requested = searchParams.get('section')
    return isSection(requested) ? requested : 'overview'
  })
  const [editing, setEditing] = useState<Property | null>(null)
  const [creating, setCreating] = useState(() => searchParams.get('create') === '1')
  const [offerTab, setOfferTab] = useState('all')
  const [showingTab, setShowingTab] = useState('all')
  const [inquiryTab, setInquiryTab] = useState('all')
  const [focusInquiryId, setFocusInquiryId] = useState<string | null>(null)

  useEffect(() => {
    if (ready && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/login?redirect=/admin')
    }
  }, [ready, currentUser, router])

  // Auto-start the onboarding tour once for admins who have never completed or
  // dismissed it. Guarded by a ref so it fires at most once per mount.
  useEffect(() => {
    if (!ready || !currentUser || currentUser.role !== 'admin') return
    if (tourAutoStarted.current) return
    if (!currentUser.adminTourCompletedAt) {
      tourAutoStarted.current = true
      setTourOpen(true)
    }
  }, [ready, currentUser])

  const propertyMap = useMemo(
    () => Object.fromEntries(properties.map((p) => [p.id, p])),
    [properties],
  )

  if (!ready || !currentUser || currentUser.role !== 'admin') return null

  const activeListings = properties.filter((p) => p.status === 'available')
  const investors = users.filter((u) => u.role === 'investor')
  const openOffers = offers.filter((o) => o.status === 'new' || o.status === 'reviewed')
  const openOffersValue = openOffers.reduce((sum, o) => sum + o.amount, 0)
  const newOffers = offers.filter((o) => o.status === 'new').length
  const newShowings = showings.filter((s) => s.status === 'new').length
  const newInquiries = inquiries.filter((i) => i.status === 'new').length
  const firstName = currentUser.name.split(' ')[0]

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const notifications = buildAdminNotifications(offers, showings, inquiries, properties)

  const goTo = (s: Section) => setSection(s)

  /** Open (or start) a message thread with an offer/showing lead, then jump to
   *  the Messages tab with the composer focused. */
  const messageLead = async (lead: {
    name: string
    company?: string
    email: string
    phone?: string
    propertyId?: string | null
    message: string
  }) => {
    const id = await startConversation(lead)
    setSection('messages')
    if (id) setFocusInquiryId(id)
  }

  const openFromNotification = (kind: Notification['kind']) => {
    if (kind === 'offer') setSection('offers')
    else if (kind === 'inquiry') setSection('messages')
    else setSection('showings')
  }

  // Finish and permanent-dismiss both persist so the tour won't auto-open again;
  // "Skip for now" just closes it for this session.
  const finishTour = () => {
    setTourOpen(false)
    void completeAdminTour()
  }
  const skipTourForNow = () => setTourOpen(false)
  const startTour = () => {
    tourAutoStarted.current = true
    setTourOpen(true)
  }

  return (
    <div className="flex min-h-dvh bg-secondary">
      <AdminSidebar
        active={section}
        user={currentUser}
        onLogout={() => {
          logout()
          router.push('/')
        }}
        badges={{ offers: newOffers, showings: newShowings, messages: newInquiries }}
        onSelectSection={goTo}
        onQuickCreate={() => setCreating(true)}
      />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          title={navLabel(section)}
          notifications={notifications}
          onSelectNotification={openFromNotification}
          onStartTour={startTour}
        />

        <AdminMobileNav active={section} onSelectSection={goTo} />

  <main className="mx-auto w-full max-w-none flex-1 px-4 py-8 sm:px-8">
          {section === 'overview' && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{today}</p>
                  <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground text-balance">
                    {greeting()}, {firstName}.
                  </h1>
                  <p className="mt-1 text-muted-foreground">
                    Here is what is moving across your marketplace.
                  </p>
                </div>
                <Button onClick={() => setCreating(true)}>
                  <Plus className="size-4" /> Add property
                </Button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Open offer value"
                  value={formatCurrency(openOffersValue)}
                  delta={trendPct(offers)}
                  icon={LineChart}
                />
                <StatCard
                  label="Active listings"
                  value={String(activeListings.length)}
                  delta={trendPct(properties)}
                  icon={Building2}
                />
                <StatCard
                  label="Registered investors"
                  value={String(investors.length)}
                  delta={trendPct(investors)}
                  icon={Users}
                />
                <StatCard
                  label="Showing requests"
                  value={String(showings.length)}
                  delta={trendPct(showings)}
                  icon={CalendarDays}
                />
              </div>

        <div className="mt-6">
          <ActivityChart />
        </div>

              <div className="mt-6">
                <PropertiesTable
                  properties={properties}
                  onEdit={setEditing}
                  onDelete={confirmDeleteProperty}
                  onCreate={() => setCreating(true)}
                />
              </div>
            </>
          )}

          {section === 'properties' && (
            <Panel
              title="Properties"
              subtitle="Add, edit, or retire listings."
              action={
                <Button onClick={() => setCreating(true)}>
                  <Plus className="size-4" /> Add property
                </Button>
              }
            >
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {properties.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={p.photos[0]?.url || '/placeholder.svg'}
                          alt=""
                          className="size-14 rounded-md object-cover"
                        />
                        <div>
                          <p className="font-medium text-foreground">{p.address}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.neighborhood} · {formatCurrency(p.price)} · {p.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={p.status} />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditing(p)}
                          aria-label={`Edit ${p.address}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => confirmDeleteProperty(p.id)}
                          aria-label={`Delete ${p.address}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          )}

          {section === 'offers' && (
            <Panel title="Offers" subtitle="Review and respond to investor offers.">
              <DataTable<Offer>
                rows={offers}
                tabs={OFFER_TABS}
                activeTab={offerTab}
                onTabChange={setOfferTab}
                countFor={(id) =>
                  id === 'all' ? offers.length : offers.filter((o) => o.status === id).length
                }
                filterFor={(o, id) => o.status === id}
                rowLabel={(o) => `Select offer from ${o.name}`}
                emptyLabel="No offers in this view."
                columns={[
                  {
                    key: 'property',
                    header: 'Property',
                    cell: (o) => (
                      <span className="font-medium text-foreground">
                        {propertyMap[o.propertyId]?.address ?? 'Property'}
                      </span>
                    ),
                  },
                  {
                    key: 'investor',
                    header: 'Investor',
                    cell: (o) => (
                      <div className="leading-tight">
                        <p className="text-foreground">{o.name}</p>
                        {o.company && <p className="text-xs text-muted-foreground">{o.company}</p>}
                      </div>
                    ),
                  },
                  {
                    key: 'contact',
                    header: 'Contact',
                    headClassName: 'hidden lg:table-cell',
                    cellClassName: 'hidden lg:table-cell text-muted-foreground',
                    cell: (o) => (
                      <div className="leading-tight text-xs">
                        <p>{o.email}</p>
                        <p>{o.phone}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    align: 'right',
                    cellClassName: 'font-medium tabular-nums',
                    cell: (o) => formatCurrency(o.amount),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (o) => <StatusPill status={o.status} />,
                  },
                  {
                    key: 'received',
                    header: 'Received',
                    headClassName: 'hidden md:table-cell',
                    cellClassName: 'hidden md:table-cell text-muted-foreground',
                    cell: (o) => formatDate(o.createdAt),
                  },
                ]}
                action={(o) => (
                  <StatusMenu
                    label={`Update offer from ${o.name}`}
                    value={o.status}
                    options={OFFER_STATUS_OPTIONS}
                    onChange={(v) => updateOfferStatus(o.id, v as Offer['status'])}
                    onMessage={() =>
                      void messageLead({
                        name: o.name,
                        company: o.company,
                        email: o.email,
                        phone: o.phone,
                        propertyId: o.propertyId,
                        message: `Offer of ${formatCurrency(o.amount)} on ${
                          propertyMap[o.propertyId]?.address ?? 'a property'
                        }.${o.notes ? ` Notes: ${o.notes}` : ''}`,
                      })
                    }
                  />
                )}
              />
            </Panel>
          )}

          {section === 'showings' && (
            <Panel
              title="Showings"
              subtitle="Confirm walkthroughs and schedule tours."
            >
              <DataTable<ShowingRequest>
                rows={showings}
                tabs={SHOWING_TABS}
                activeTab={showingTab}
                onTabChange={setShowingTab}
                countFor={(id) =>
                  id === 'all' ? showings.length : showings.filter((s) => s.status === id).length
                }
                filterFor={(s, id) => s.status === id}
                rowLabel={(s) => `Select showing from ${s.name}`}
                emptyLabel="No showing requests in this view."
                columns={[
                  {
                    key: 'property',
                    header: 'Property',
                    cell: (s) => (
                      <span className="font-medium text-foreground">
                        {propertyMap[s.propertyId]?.address ?? 'Property'}
                      </span>
                    ),
                  },
                  {
                    key: 'requester',
                    header: 'Requested by',
                    cell: (s) => (
                      <div className="leading-tight">
                        <p className="text-foreground">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'preferred',
                    header: 'Preferred time',
                    headClassName: 'hidden md:table-cell',
                    cellClassName: 'hidden md:table-cell text-muted-foreground',
                    cell: (s) => s.preferredTime,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (s) => <StatusPill status={s.status} />,
                  },
                  {
                    key: 'received',
                    header: 'Received',
                    headClassName: 'hidden lg:table-cell',
                    cellClassName: 'hidden lg:table-cell text-muted-foreground',
                    cell: (s) => formatDate(s.createdAt),
                  },
                ]}
                action={(s) => (
                  <StatusMenu
                    label={`Update showing from ${s.name}`}
                    value={s.status}
                    options={SHOWING_STATUS_OPTIONS}
                    onChange={(v) => updateShowingStatus(s.id, v as ShowingRequest['status'])}
                    onMessage={() =>
                      void messageLead({
                        name: s.name,
                        company: s.company,
                        email: s.email,
                        phone: s.phone,
                        propertyId: s.propertyId,
                        message: `Showing request for ${
                          propertyMap[s.propertyId]?.address ?? 'a property'
                        }. Preferred time: ${s.preferredTime || 'not specified'}.${
                          s.message ? ` Message: ${s.message}` : ''
                        }`,
                      })
                    }
                  />
                )}
              />
            </Panel>
          )}

          {section === 'messages' && (
            <Panel title="Messages" subtitle="Contact-form messages from investors and visitors.">
              <MessagesInbox
                inquiries={inquiries}
                propertyMap={propertyMap}
                onUpdateStatus={updateInquiryStatus}
                onReply={replyToInquiry}
              />
            </Panel>
          )}

          {section === 'investors' && (
            <Panel title="Investors" subtitle="Everyone with a marketplace account.">
              <DataTable<User>
                rows={investors}
                rowLabel={(u) => `Select ${u.name}`}
                emptyLabel="No investors registered yet."
                columns={[
                  {
                    key: 'investor',
                    header: 'Investor',
                    cell: (u) => (
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm font-bold text-foreground">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="leading-tight">
                          <p className="font-medium text-foreground">{u.name}</p>
                          {u.company && <p className="text-xs text-muted-foreground">{u.company}</p>}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    cellClassName: 'text-muted-foreground',
                    cell: (u) => u.email,
                  },
                  {
                    key: 'phone',
                    header: 'Phone',
                    headClassName: 'hidden md:table-cell',
                    cellClassName: 'hidden md:table-cell text-muted-foreground',
                    cell: (u) => u.phone,
                  },
                  {
                    key: 'joined',
                    header: 'Joined',
                    headClassName: 'hidden lg:table-cell',
                    cellClassName: 'hidden lg:table-cell text-muted-foreground',
                    cell: (u) => formatDate(u.createdAt),
                  },
                ]}
              />
            </Panel>
          )}

          {section === 'testimonials' && (
            <Panel
              title="Testimonials"
              subtitle="Add and manage the reviews shown in the landing page carousel."
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                <TestimonialForm onAdd={addTestimonial} />
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Published ({testimonials.length})
                  </h3>
                  {testimonials.length === 0 ? (
                    <EmptyState label="No testimonials yet. Add your first one." />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {testimonials.map((t) => (
                        <div
                          key={t.id}
                          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                              {Array.from({ length: t.rating }).map((_, i) => (
                                <Star key={i} className="size-3.5 fill-primary text-primary" />
                              ))}
                            </div>
                            <p className="mt-2 text-sm text-foreground text-pretty">
                              &ldquo;{t.quote}&rdquo;
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{t.name}</p>
                            <p className="text-xs text-muted-foreground">{t.role}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => confirmDeleteTestimonial(t.id)}
                            aria-label={`Delete testimonial from ${t.name}`}
                            className="shrink-0"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {section === 'audit' && (
            <Panel
              title="Audit log"
              subtitle="Append-only record of admin-facing changes. Written by the database and readable only by admins — entries cannot be edited or deleted."
            >
              {auditLogs.length === 0 ? (
                <EmptyState label="No audit activity recorded yet." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="hidden grid-cols-[10rem_5rem_1fr_1fr_7rem] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                    <span>When</span>
                    <span>Action</span>
                    <span>Record</span>
                    <span>Actor</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-border">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="grid grid-cols-2 gap-2 px-4 py-3 text-sm sm:grid-cols-[10rem_5rem_1fr_1fr_7rem] sm:items-center sm:gap-3"
                      >
                        <span className="order-1 text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </span>
                        <span className="order-3 sm:order-2">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[11px] ${AUDIT_ACTION_STYLES[log.action] ?? ''}`}
                          >
                            {log.action}
                          </Badge>
                        </span>
                        <span className="order-4 min-w-0 sm:order-3">
                          <span className="font-medium text-foreground">{log.tableName}</span>
                          {log.recordId && (
                            <span className="ml-1.5 truncate font-mono text-xs text-muted-foreground">
                              {log.recordId.slice(0, 8)}
                            </span>
                          )}
                        </span>
                        <span className="order-2 text-muted-foreground sm:order-4">
                          {log.actorRole ?? 'unknown'}
                        </span>
                        <span className="order-5 text-muted-foreground">{log.status ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}
        </main>
      </div>

      {(editing || creating) && (
        <PropertyEditor
          property={editing}
          open={Boolean(editing) || creating}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(null)
              setCreating(false)
            }
          }}
        />
      )}

      {confirmDialog}

      <AdminTour
        open={tourOpen}
        steps={TOUR_STEPS}
        onFinish={finishTour}
        onDismissPermanently={finishTour}
        onSkipForNow={skipTourForNow}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string
  value: string
  delta: number
  icon: typeof LayoutGrid
}) {
  const up = delta >= 0
  const TrendIcon = up ? TrendingUp : TrendingDown
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
          <Icon className="size-[18px]" />
        </span>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          <TrendIcon className="size-3.5" />
          {up ? '+' : ''}
          {delta}%
        </span>
      </div>
    </div>
  )
}

function TestimonialForm({
  onAdd,
}: {
  onAdd: (t: { name: string; role: string; quote: string; rating: number }) => void
}) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [quote, setQuote] = useState('')
  const [rating, setRating] = useState(5)
  const [saved, setSaved] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !quote.trim()) return
    onAdd({ name: name.trim(), role: role.trim(), quote: quote.trim(), rating })
    setName('')
    setRole('')
    setQuote('')
    setRating(5)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30'

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <div>
        <label htmlFor="t-name" className="mb-1.5 block text-sm font-medium text-foreground">
          Reviewer name
        </label>
        <input
          id="t-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Marcus Reed"
          className={inputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="t-role" className="mb-1.5 block text-sm font-medium text-foreground">
          Role / location
        </label>
        <input
          id="t-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Buy-and-hold investor, Chicago"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="t-quote" className="mb-1.5 block text-sm font-medium text-foreground">
          Testimonial
        </label>
        <textarea
          id="t-quote"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          placeholder="Share what the investor said about working with you..."
          rows={4}
          className={`${inputClass} resize-y`}
          required
        />
      </div>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">Rating</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              aria-pressed={rating === n}
              className="rounded-sm p-0.5"
            >
              <Star
                className={`size-6 transition-colors ${
                  n <= rating ? 'fill-primary text-primary' : 'text-border'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit">
          <Plus className="size-4" /> Add testimonial
        </Button>
        {saved && (
          <span className="text-sm font-medium text-primary">Published to landing page.</span>
        )}
      </div>
    </form>
  )
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const style = PILL_STYLES[status] ?? 'bg-muted text-muted-foreground'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {status}
    </span>
  )
}

function StatusMenu({
  label,
  value,
  options,
  onChange,
  onMessage,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  /** When provided, renders a "Message" action at the top of the menu. */
  onMessage?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onMessage && (
          <>
            <DropdownMenuItem onClick={onMessage}>
              <Mail className="size-4" /> Message
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>Set status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Wrapped in Suspense because the dashboard reads `useSearchParams()` to honor
 *  cross-route deep links (e.g. `/admin?section=offers`) from the sidebar. */
export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  )
}
