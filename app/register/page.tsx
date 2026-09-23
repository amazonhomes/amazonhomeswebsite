'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Check, KeyRound, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { AltAuth } from '@/components/auth/alt-auth'
import { PageShell } from '@/components/page-shell'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'

const perks = [
  'Unlock full photo galleries and interior shots',
  'See detailed ARV and rehab financials',
  'Submit offers and request showings',
  'First access to new off-market deals',
]

export default function RegisterPage() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/properties'
  const { register } = useStore()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const [existingAccount, setExistingAccount] = useState(false)

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await register(form)
    setSubmitting(false)
    if (result.existingAccount) {
      setExistingAccount(true)
      return
    }
    if (result.ok && result.needsConfirmation) {
      setConfirmEmail(form.email)
      return
    }
    if (result.ok) {
      toast.success('Account created — photos unlocked')
      router.push(redirect)
    } else {
      setError(result.error ?? 'Unable to register.')
    }
  }

  if (existingAccount) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-foreground">
            <KeyRound className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            You may already have an account
          </h1>
          <p className="mt-2 text-muted-foreground">
            An account may already exist with these details. Try signing in, or
            reset your password to regain access.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>Sign In</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/forgot-password">Forgot Password?</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    )
  }

  if (confirmEmail) {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <MailCheck className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Confirm your email
          </h1>
          <p className="mt-2 text-muted-foreground">
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{confirmEmail}</span>. Click it to
            activate your account, then log in to unlock photos and financials.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={`/login?redirect=${encodeURIComponent(redirect)}`}>Go to login</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Join the buyers list
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create a free account to unlock everything and get on our list for
            first access to new Detroit deals.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Check className="size-3.5" />
                </span>
                <span className="text-sm text-foreground">{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-name">Full name</Label>
              <Input
                id="r-name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-email">Email</Label>
              <Input
                id="r-email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-phone">Phone</Label>
              <Input
                id="r-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-company">Company (optional)</Label>
              <Input
                id="r-company"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-password">Password</Label>
              <PasswordInput
                id="r-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account & unlock'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already registered?{' '}
            <Link
              href="/login"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </PageShell>
  )
}
