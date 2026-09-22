'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Establish that we're in a valid recovery context. In the normal flow the
  // /auth/callback route has already exchanged the recovery code and set the
  // session cookie, so a session is present. We also handle a bare ?code= (a
  // production redirect pointed straight here) and Supabase error params (an
  // expired/used link).
  useEffect(() => {
    let active = true

    async function init() {
      const url = new URL(window.location.href)
      const hasError =
        url.searchParams.has('error') ||
        url.searchParams.has('error_code') ||
        url.hash.includes('error')
      if (hasError) {
        if (active) setStatus('invalid')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        if (active) setStatus('ready')
        return
      }

      const code = url.searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (active) setStatus(error ? 'invalid' : 'ready')
        return
      }

      if (active) setStatus('invalid')
    }

    void init()

    // A recovery link processed client-side fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setStatus('ready')
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    if (!password || !confirm) {
      setError('Please fill in both password fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setSubmitting(false)
      setError(
        /different|should be/i.test(error.message)
          ? 'Choose a password different from your current one.'
          : 'Could not update your password. Your reset link may have expired.',
      )
      return
    }
    // A recovery session is AAL1 only. Sign out so it can never double as a
    // full login — admins must still complete MFA (AAL2) on their next sign-in,
    // and the old password stops working immediately.
    await supabase.auth.signOut()
    setSubmitting(false)
    setStatus('done')
  }

  if (status === 'checking') {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying your reset link…</p>
        </div>
      </PageShell>
    )
  }

  if (status === 'invalid') {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Reset link invalid or expired
          </h1>
          <p className="mt-2 text-muted-foreground">
            This password reset link is invalid or has expired. Request a new one
            to continue.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/forgot-password">Request a new reset link</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  if (status === 'done') {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
            Password updated successfully
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your password has been changed. Sign in with your new password to
            continue.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose a strong password you don&apos;t use anywhere else.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-password">New password</Label>
            <PasswordInput
              id="rp-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rp-confirm">Confirm new password</Label>
            <PasswordInput
              id="rp-confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value)
                setError(null)
              }}
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </div>
    </PageShell>
  )
}
