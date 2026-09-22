'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/lib/store'

export function ContactForm({ propertyId = null }: { propertyId?: string | null }) {
  const { currentUser, submitInquiry } = useStore()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [company, setCompany] = useState(currentUser?.company ?? '')
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [message, setMessage] = useState('')

  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const res = await submitInquiry({ propertyId, name, company, email, phone, message })
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error ?? 'Could not send your message.')
      return
    }
    toast.success('Message sent', {
      description: "Thanks for reaching out — we'll be in touch shortly.",
    })
    setMessage('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-name">Full name</Label>
          <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-company">Company</Label>
          <Input
            id="c-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="c-phone">Phone</Label>
          <Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="c-message">Message</Label>
        <Textarea
          id="c-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us your buy box, target neighborhoods, and price range…"
          rows={4}
          required
        />
      </div>
      <Button type="submit" size="lg">
        Send Message
      </Button>
    </form>
  )
}
