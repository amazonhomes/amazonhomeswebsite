'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/phone-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { coerceInitialPhone, validatePhoneField } from '@/lib/phone'
import { useStore } from '@/lib/store'
import type { Property } from '@/lib/types'

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
  const [preferredTime, setPreferredTime] = useState('')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const phoneCheck = validatePhoneField(phone, { required: true })
    if (!phoneCheck.ok) {
      setPhoneError(phoneCheck.error)
      return
    }
    setSubmitting(true)
    const res = await submitShowing({
      propertyId: property.id,
      userId: currentUser?.id ?? null,
      name,
      company,
      email,
      phone: phoneCheck.value,
      preferredTime,
      message,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not submit your request.')
      return
    }
    toast.success('Showing requested', {
      description: `We'll reach out to schedule a walkthrough of ${property.address}.`,
    })
    setPreferredTime('')
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
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="show-time">Preferred showing time</Label>
        <Input
          id="show-time"
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          placeholder="e.g. Weekday mornings, this Saturday"
          required
        />
      </div>
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
      <Button type="submit" size="lg">
        Request Showing
      </Button>
    </form>
  )
}
