'use client'

import type { ReactNode } from 'react'
import { Mail, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { purchaseMethodLabel } from '@/lib/rehab'
import { formatShowingDate, formatShowingTime } from '@/lib/showing-schedule'
import type { Offer, Property, ShowingRequest, User } from '@/lib/types'

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

export function StatusPill({ status }: { status: string }) {
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

type StatusOption = { value: string; label: string }

function Field({
  label,
  children,
  wide,
}: {
  label: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
        {children}
      </dd>
    </div>
  )
}

function Empty() {
  return <span className="text-muted-foreground">—</span>
}

function orEmpty(value: string | null | undefined): ReactNode {
  return value && value.trim() ? value : <Empty />
}

function EmailValue({ email }: { email: string }) {
  if (!email) return <Empty />
  return (
    <a href={`mailto:${email}`} className="break-all text-primary underline-offset-2 hover:underline">
      {email}
    </a>
  )
}

function PhoneValue({ phone }: { phone: string | null | undefined }) {
  if (!phone) return <Empty />
  return (
    <a
      href={`tel:${phone.replace(/[^\d+]/g, '')}`}
      className="whitespace-nowrap text-primary underline-offset-2 hover:underline"
    >
      {phone}
    </a>
  )
}

function StatusControl({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: string
  options: StatusOption[]
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Label htmlFor={id} className="text-sm text-muted-foreground">
        Status
      </Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger id={id} className="h-9 w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <StatusPill status={value} />
    </div>
  )
}

function RecordFooter({
  onMessage,
  onDelete,
  deleteLabel,
  onClose,
}: {
  onMessage: () => void
  onDelete: () => void
  deleteLabel: string
  onClose: () => void
}) {
  return (
    <DialogFooter className="m-0 shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-2">
      <Button variant="destructive" onClick={onDelete}>
        <Trash2 className="size-4" /> {deleteLabel}
      </Button>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onMessage}>
          <Mail className="size-4" /> Message
        </Button>
      </div>
    </DialogFooter>
  )
}

const DIALOG_CLASS = 'flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-2xl'
const BODY_CLASS = 'flex flex-col gap-6 overflow-y-auto px-6 py-5'

/* -------------------------------- Offer -------------------------------- */

export function OfferDetailsDialog({
  offer,
  property,
  statusOptions,
  onOpenChange,
  onStatusChange,
  onMessage,
  onDelete,
}: {
  offer: Offer | null
  property: Property | undefined
  statusOptions: StatusOption[]
  onOpenChange: (open: boolean) => void
  onStatusChange: (status: Offer['status']) => void
  onMessage: () => void
  onDelete: () => void
}) {
  const method = offer ? purchaseMethodLabel(offer.purchaseMethod, offer.purchaseMethodOther) : null
  return (
    <Dialog open={!!offer} onOpenChange={onOpenChange}>
      {offer && (
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="pr-6">Offer from {offer.name}</DialogTitle>
            <DialogDescription className="break-words">
              {property?.address ?? 'Property no longer listed'}
            </DialogDescription>
          </DialogHeader>
          <div className={BODY_CLASS}>
            <StatusControl
              id="offer-detail-status"
              value={offer.status}
              options={statusOptions}
              onChange={(v) => onStatusChange(v as Offer['status'])}
            />
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Offer amount">
                <span className="text-lg font-semibold tabular-nums">
                  {formatCurrency(offer.amount)}
                </span>
              </Field>
              <Field label="Method of purchase">{method ?? <Empty />}</Field>
              <Field label="Property address" wide>
                {property?.address ?? <Empty />}
              </Field>
              <Field label="Investor">{orEmpty(offer.name)}</Field>
              <Field label="Company">{orEmpty(offer.company)}</Field>
              <Field label="Email">
                <EmailValue email={offer.email} />
              </Field>
              <Field label="Phone">
                <PhoneValue phone={offer.phone} />
              </Field>
              <Field label="Submitted">{formatDateTime(offer.createdAt)}</Field>
              <Field label="Account">
                {offer.userId ? 'Registered investor' : 'Guest submission'}
              </Field>
              <Field label="Special stipulations / terms" wide>
                {orEmpty(offer.specialTerms)}
              </Field>
              <Field label="General notes" wide>
                {orEmpty(offer.notes)}
              </Field>
            </dl>
          </div>
          <div className="border-t border-border px-6 py-4">
            <RecordFooter
              onMessage={onMessage}
              onDelete={onDelete}
              deleteLabel="Delete offer"
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

/* ------------------------------- Showing ------------------------------- */

export function ShowingDetailsDialog({
  showing,
  property,
  statusOptions,
  onOpenChange,
  onStatusChange,
  onMessage,
  onDelete,
}: {
  showing: ShowingRequest | null
  property: Property | undefined
  statusOptions: StatusOption[]
  onOpenChange: (open: boolean) => void
  onStatusChange: (status: ShowingRequest['status']) => void
  onMessage: () => void
  onDelete: () => void
}) {
  const legacyPreference = showing?.preferredTime?.trim() ?? ''
  return (
    <Dialog open={!!showing} onOpenChange={onOpenChange}>
      {showing && (
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle className="pr-6">Showing request from {showing.name}</DialogTitle>
            <DialogDescription className="break-words">
              {property?.address ?? 'Property no longer listed'}
            </DialogDescription>
          </DialogHeader>
          <div className={BODY_CLASS}>
            <StatusControl
              id="showing-detail-status"
              value={showing.status}
              options={statusOptions}
              onChange={(v) => onStatusChange(v as ShowingRequest['status'])}
            />
            <dl className="grid gap-4 sm:grid-cols-2">
              {showing.preferredAt ? (
                <>
                  <Field label="Preferred date">{formatShowingDate(showing.preferredAt)}</Field>
                  <Field label="Preferred time">{formatShowingTime(showing.preferredAt)}</Field>
                </>
              ) : (
                <Field label="Preferred showing (as submitted)" wide>
                  {legacyPreference || 'Not specified'}
                </Field>
              )}
              <Field label="Property address" wide>
                {property?.address ?? <Empty />}
              </Field>
              <Field label="Requested by">{orEmpty(showing.name)}</Field>
              <Field label="Company">{orEmpty(showing.company)}</Field>
              <Field label="Email">
                <EmailValue email={showing.email} />
              </Field>
              <Field label="Phone">
                <PhoneValue phone={showing.phone} />
              </Field>
              <Field label="Submitted">{formatDateTime(showing.createdAt)}</Field>
              <Field label="Account">
                {showing.userId ? 'Registered investor' : 'Guest submission'}
              </Field>
              <Field label="Message" wide>
                {orEmpty(showing.message)}
              </Field>
            </dl>
          </div>
          <div className="border-t border-border px-6 py-4">
            <RecordFooter
              onMessage={onMessage}
              onDelete={onDelete}
              deleteLabel="Delete showing"
              onClose={() => onOpenChange(false)}
            />
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

/* ------------------------------- Investor ------------------------------ */

export function InvestorDetailsDialog({
  investor,
  offers,
  showings,
  propertyMap,
  onOpenChange,
  onViewOffer,
  onViewShowing,
}: {
  investor: User | null
  /** Offers linked to this investor's account (offers.user_id). */
  offers: Offer[]
  /** Showing requests linked to this investor's account (showing_requests.user_id). */
  showings: ShowingRequest[]
  propertyMap: Record<string, Property>
  onOpenChange: (open: boolean) => void
  onViewOffer: (offer: Offer) => void
  onViewShowing: (showing: ShowingRequest) => void
}) {
  return (
    <Dialog open={!!investor} onOpenChange={onOpenChange}>
      {investor && (
        <DialogContent className={DIALOG_CLASS}>
          <DialogHeader className="border-b border-border px-6 pb-4 pt-6 text-left">
            <div className="flex items-center gap-3 pr-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-base font-bold text-foreground">
                {investor.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <DialogTitle className="break-words">{investor.name}</DialogTitle>
                <DialogDescription>Investor since {formatDate(investor.createdAt)}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className={BODY_CLASS}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">{orEmpty(investor.name)}</Field>
              <Field label="Company">{orEmpty(investor.company)}</Field>
              <Field label="Email">
                <EmailValue email={investor.email} />
              </Field>
              <Field label="Phone">
                <PhoneValue phone={investor.phone} />
              </Field>
              <Field label="Role">
                <span className="capitalize">{investor.role}</span>
              </Field>
              <Field label="Joined">{formatDateTime(investor.createdAt)}</Field>
            </dl>

            <ActivityList
              title="Offers submitted"
              empty="No offers linked to this account."
              items={offers.map((o) => ({
                id: o.id,
                primary: propertyMap[o.propertyId]?.address ?? 'Property no longer listed',
                secondary: `${formatCurrency(o.amount)} · ${formatDate(o.createdAt)}`,
                status: o.status,
                onView: () => onViewOffer(o),
              }))}
            />
            <ActivityList
              title="Showing requests"
              empty="No showing requests linked to this account."
              items={showings.map((s) => ({
                id: s.id,
                primary: propertyMap[s.propertyId]?.address ?? 'Property no longer listed',
                secondary: s.preferredAt
                  ? `${formatShowingDate(s.preferredAt)} · ${formatShowingTime(s.preferredAt)}`
                  : s.preferredTime?.trim() || 'No preference given',
                status: s.status,
                onView: () => onViewShowing(s),
              }))}
            />
            <p className="text-xs text-muted-foreground">
              Activity shows records submitted while signed in to this account. Saved properties
              are private to each investor and aren&apos;t visible to admins.
            </p>
          </div>
          <div className="border-t border-border px-6 py-4">
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}

function ActivityList({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: { id: string; primary: string; secondary: string; status: string; onView: () => void }[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onView}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {item.primary}
                  </span>
                  <span className="block text-xs text-muted-foreground">{item.secondary}</span>
                </span>
                <StatusPill status={item.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}