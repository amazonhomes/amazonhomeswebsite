'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { PhoneInput } from '@/components/phone-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { coerceInitialPhone, validatePhoneField } from '@/lib/phone'
import { PURCHASE_METHODS } from '@/lib/rehab'
import { useStore } from '@/lib/store'
import type { Property, PurchaseMethod } from '@/lib/types'

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
  const [purchaseMethod, setPurchaseMethod] = useState<PurchaseMethod | null>(null)
  const [purchaseMethodOther, setPurchaseMethodOther] = useState('')
  const [specialTerms, setSpecialTerms] = useState('')
  const [name, setName] = useState(currentUser?.name ?? '')
  const [company, setCompany] = useState(currentUser?.company ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState(coerceInitialPhone(currentUser?.phone))
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    const numeric = Number(amount.replace(/[^0-9.]/g, ''))
    if (!numeric || numeric <= 0) {
      toast.error('Enter a valid offer amount.')
      return
    }
    if (!purchaseMethod) {
      toast.error('Select a method of purchase.')
      return
    }
    if (purchaseMethod === 'other' && !purchaseMethodOther.trim()) {
      toast.error('Please specify your method of purchase.')
      return
    }
    const phoneCheck = validatePhoneField(phone, { required: true })
    if (!phoneCheck.ok) {
      setPhoneError(phoneCheck.error)
      return
    }
    setSubmitting(true)
    const res = await submitOffer({
      propertyId: property.id,
      userId: currentUser?.id ?? null,
      name,
      company,
      email,
      phone: phoneCheck.value,
      amount: numeric,
      notes,
      purchaseMethod,
      purchaseMethodOther: purchaseMethod === 'other' ? purchaseMethodOther.trim() : null,
      specialTerms: specialTerms.trim() || null,
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
    setPurchaseMethod(null)
    setPurchaseMethodOther('')
    setSpecialTerms('')
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
          <PhoneInput
            id="offer-phone"
            value={phone}
            onChange={(v) => {
              setPhone(v)
              setPhoneError(null)
            }}
            required
            invalid={!!phoneError}
            describedBy={phoneError ? 'offer-phone-error' : undefined}
          />
          {phoneError && (
            <p id="offer-phone-error" className="text-sm text-destructive">
              {phoneError}
            </p>
          )}
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium leading-none">Method of purchase</legend>
        <div className="grid grid-cols-3 gap-2">
          {PURCHASE_METHODS.map((m) => (
            <label
              key={m.value}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input
                type="radio"
                name="offer-purchase-method"
                value={m.value}
                checked={purchaseMethod === m.value}
                onChange={() => setPurchaseMethod(m.value)}
                className="accent-primary"
                required
              />
              {m.label}
            </label>
          ))}
        </div>
        {purchaseMethod === 'other' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="offer-purchase-other">Specify method of purchase</Label>
            <Input
              id="offer-purchase-other"
              value={purchaseMethodOther}
              onChange={(e) => setPurchaseMethodOther(e.target.value)}
              placeholder="e.g. Seller financing, 1031 exchange"
              maxLength={500}
              required
            />
          </div>
        )}
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-special-terms">Special terms</Label>
        <Textarea
          id="offer-special-terms"
          value={specialTerms}
          onChange={(e) => setSpecialTerms(e.target.value)}
          placeholder="Agent fees, remarks, conditions…"
          rows={3}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="offer-notes">Notes</Label>
        <Textarea
          id="offer-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
          rows={2}
        />
      </div>
      <Button type="submit" size="lg">
        Submit Offer
      </Button>
    </form>
  )
}