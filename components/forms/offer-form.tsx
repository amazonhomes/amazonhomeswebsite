'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'
import type { Property } from '@/lib/types'

export function OfferForm({
  property,
  onDone,
}: {
  property: Property
  onDone?: () => void
}) {
  const { currentUser, submitOffer } = useStore()
   const router = useRouter()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [name, setName] = useState(currentUser?.name ?? '')
  const [company, setCompany] = useState(currentUser?.company ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const numeric = Number(amount.replace(/[^0-9.]/g, ''))
    if (!numeric || numeric <= 0) {
      toast.error('Enter a valid offer amount.')
      return
    }
    setSubmitting(true)
    const res = await submitOffer({
      propertyId: property.id,
      userId: currentUser?.id ?? null,
      name,
      company,
      email,
      phone,
      amount: numeric,
      notes,
    })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not submit your offer.')
      return
    }
    toast.success('Offer submitted', {
       description: currentUser
        ? 'Track its status anytime from My Offers in your account.'
        : `Our team will follow up on your offer for ${property.address}.`,
      // Signed-in investors get a direct path to track the offer they just made.
      action: currentUser
        ? {
            label: 'View My Offers',
            onClick: () => router.push('/account/offers'),
          }
        : undefined,
        })
    setAmount('')
    setNotes('')
    onDone?.()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offer-name">Full name</Label>
          <Input id="offer-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offer-company">Company</Label>
          <Input
            id="offer-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offer-email">Email</Label>
          <Input
            id="offer-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="offer-phone">Phone</Label>
          <Input
            id="offer-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-amount">Offer amount (USD)</Label>
        <Input
          id="offer-amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 85000"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-notes">Notes / terms</Label>
        <Textarea
          id="offer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cash, financing, close timeline, contingencies…"
          rows={3}
        />
      </div>
      <Button type="submit" size="lg">
        Submit Offer
      </Button>
    </form>
  )
}
