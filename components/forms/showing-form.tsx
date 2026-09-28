'use client'

import { useMemo, useState } from 'react'
import { CalendarIcon, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/phone-input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { coerceInitialPhone, validatePhoneField } from '@/lib/phone'
import {
  availableSlots,
  calendarDateToKey,
  detroitTodayKey,
  formatSlotLabel,
  keyToCalendarDate,
  validateShowingSlot,
} from '@/lib/showing-schedule'
import { useStore } from '@/lib/store'
import { BUSINESS_TZ_LABEL } from '@/lib/timezone'
import type { Property } from '@/lib/types'
import { cn } from '@/lib/utils'

const dateButtonFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function ShowingForm({
  property,
  onDone,
}: {
  property: Property
  onDone?: () => void
}) {
  const { currentUser, submitShowing } = useStore()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [company, setCompany] = useState(currentUser?.company ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState(coerceInitialPhone(currentUser?.phone))
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [dateKey, setDateKey] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Earliest bookable Detroit day: today, unless every slot today has passed.
  const minDateKey = useMemo(() => {
    const today = detroitTodayKey()
    if (availableSlots(today).length > 0) return today
    const next = keyToCalendarDate(today)
    next.setDate(next.getDate() + 1)
    return calendarDateToKey(next)
  }, [])

  const slots = useMemo(() => (dateKey ? availableSlots(dateKey) : []), [dateKey])

  function handleDateSelect(d: Date | undefined) {
    if (!d) return
    const key = calendarDateToKey(d)
    setDateKey(key)
    setCalendarOpen(false)
    setScheduleError(null)
    if (slot && !availableSlots(key).includes(slot)) setSlot(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const phoneCheck = validatePhoneField(phone, { required: true })
    if (!phoneCheck.ok) setPhoneError(phoneCheck.error)
    const slotCheck = validateShowingSlot(dateKey, slot)
    if (!slotCheck.ok) setScheduleError(slotCheck.error)
    if (!phoneCheck.ok || !slotCheck.ok || !dateKey || !slot) return

    setSubmitting(true)
    const res = await submitShowing({
      propertyId: property.id,
      userId: currentUser?.id ?? null,
      name,
      company,
      email,
      phone: phoneCheck.value,
      preferredDate: dateKey,
      preferredSlot: slot,
      message,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not submit your request.')
      return
    }
    toast.success('Showing requested', {
      description: `${slotCheck.label} at ${property.address}. We'll confirm shortly.`,
    })
    setDateKey(null)
    setSlot(null)
    setMessage('')
    onDone?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="show-name">Full name</Label>
          <Input id="show-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="show-company">Company</Label>
          <Input
            id="show-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="show-email">Email</Label>
          <Input
            id="show-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="show-phone">Phone</Label>
          <PhoneInput
            id="show-phone"
            value={phone}
            onChange={(v) => {
              setPhone(v)
              setPhoneError(null)
            }}
            required
            invalid={!!phoneError}
            describedBy={phoneError ? 'show-phone-error' : undefined}
          />
          {phoneError && (
            <p id="show-phone-error" className="text-sm text-destructive">
              {phoneError}
            </p>
          )}
        </div>
      </div>

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={scheduleError ? 'show-schedule-error' : 'show-schedule-hint'}
      >
        <legend className="mb-1.5 text-sm font-medium leading-none">Preferred showing</legend>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id="show-date"
                aria-label={dateKey ? `Showing date: ${dateButtonFormat.format(keyToCalendarDate(dateKey))}` : 'Choose a showing date'}
                aria-invalid={!!scheduleError && !dateKey}
                className={cn(
                  'w-full justify-start gap-2 font-normal',
                  !dateKey && 'text-muted-foreground',
                )}
              />
            }
          >
            <CalendarIcon className="size-4" aria-hidden />
            {dateKey ? dateButtonFormat.format(keyToCalendarDate(dateKey)) : 'Choose a date'}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateKey ? keyToCalendarDate(dateKey) : undefined}
              onSelect={handleDateSelect}
              defaultMonth={keyToCalendarDate(dateKey ?? minDateKey)}
              disabled={{ before: keyToCalendarDate(minDateKey) }}
              startMonth={keyToCalendarDate(minDateKey)}
            />
          </PopoverContent>
        </Popover>

        {dateKey && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              Pick a time
            </p>
            {slots.length > 0 ? (
              <div
                role="radiogroup"
                aria-label="Showing time"
                className="grid grid-cols-3 gap-2 sm:grid-cols-4"
              >
                {slots.map((s) => {
                  const selected = slot === s
                  return (
                    <Button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSlot(s)
                        setScheduleError(null)
                      }}
                      className="tabular-nums"
                    >
                      {formatSlotLabel(s)}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No times left on this day. Please choose another date.
              </p>
            )}
          </div>
        )}

        {scheduleError ? (
          <p id="show-schedule-error" className="text-sm text-destructive">
            {scheduleError}
          </p>
        ) : (
          <p id="show-schedule-hint" className="text-xs text-muted-foreground">
            {`All times are Detroit time (${BUSINESS_TZ_LABEL}). We'll confirm by phone or email.`}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="show-message">Message</Label>
        <Textarea
          id="show-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything we should know before the walkthrough?"
          rows={3}
        />
      </div>
      <Button type="submit" size="lg" disabled={submitting} aria-busy={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {submitting ? 'Requesting…' : 'Request Showing'}
      </Button>
    </form>
  )
}
