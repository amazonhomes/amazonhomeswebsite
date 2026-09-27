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

export default function SetupAccountPage() {
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState<Status>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Supabase invitation links return implicit-flow tokens in the URL fragment.
  // The app's browser client is PKCE-only and ignores them, so the session is
  // established explicitly here, then the tokens are stripped from the URL.
  useEffect(() => {
    let active = true

    async function init() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const query = new URLSearchParams(window.location.search)

      if (hash.has('error') || hash.has('error_code') || query.has('error')) {
        if (active) setStatus('invalid')
        return
      }

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')

      if (accessToken && refreshToken && hash.get('type') === 'invite') {
        window.history.replaceState(null, '', window.location.pathname)
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (active) setStatus(error ? 'invalid' : 'ready')
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (active) setStatus(session ? 'ready' : 'invalid')
    }

    void init()
    return () => {
      active = false
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
      setError('Could not set your password. Your invitation link may have expired.')
      return
    }
    // The invitation session is AAL1 only. Sign out so the user completes a
    // normal sign-in (and MFA, for admins) with their new password.
    await supabase.auth.signOut()
    setSubmitting(false)
    setStatus('done')
  }

  if (status === 'checking') {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="mt-4 text-sm text-muted-foreground">Verifying your invitation…</p>
        </div>
      </PageShell>
    )
  }

  if (status === 'invalid') {
    return (
      <PageShell>
        <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Invitation link invalid or expired
          </h1>
          <p className="mt-2 text-muted-foreground">
            This invitation link is invalid, has already been used, or has expired. Contact
            Amazon Homes to request a new invitation, or reset your password if you have
            already set up your account.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/forgot-password">Reset password</Link>
            </Button>
          </div>
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
            Your account is ready
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your password has been set. Sign in to access the Amazon Homes Investor Portal.
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
          Welcome to Amazon Homes
        </h1>
        <p className="mt-2 text-muted-foreground">
          Create a password to finish setting up your Investor Portal account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sa-password">Password</Label>
            <PasswordInput
              id="sa-password"
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
            <Label htmlFor="sa-confirm">Confirm password</Label>
            <PasswordInput
              id="sa-confirm"
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
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Setting up…
              </>
            ) : (
              'Set up account'
            )}
          </Button>
        </form>
      </div>
    </PageShell>
  )
}