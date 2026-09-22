'use client'

import { useState } from 'react'
import { CheckCircle2, Send } from 'lucide-react'

export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('submitting')
    // Simulate a subscribe request; swap for a real endpoint when available.
    await new Promise((r) => setTimeout(r, 600))
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" />
        <div>
          <p className="text-sm font-semibold text-primary-foreground">You&apos;re on the list</p>
          <p className="mt-0.5 text-sm text-primary-foreground/70">
            We&apos;ll email you first when new Detroit deals go live.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="text-sm text-primary-foreground/70">
        Get new deals in your inbox
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="min-w-0 flex-1 rounded-md border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          <Send className="size-4" />
          {status === 'submitting' ? 'Joining…' : 'Join'}
        </button>
      </div>
    </form>
  )
}
