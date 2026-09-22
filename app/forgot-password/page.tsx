'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Guard against double-submits while the request is in flight.
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error || 'Too many requests. Please try again in a few minutes.')
        setSubmitting(false)
        return
      }
      // Any other outcome is intentionally indistinguishable — show the generic
      // confirmation whether or not an account exists for this address.
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MailCheck className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-2 text-muted-foreground">
            If an account exists for that email, we&apos;ve sent password reset
            instructions. The link expires shortly for your security.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="mt-2 text-muted-foreground">
          Enter the email on your account and we&apos;ll send a link to set a new
          password.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              'Send recovery link'
            )}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </PageShell>
  )
}
