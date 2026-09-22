'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

type Mode = 'loading' | 'enroll' | 'challenge' | 'done'

/**
 * Two-factor gate for admin/VA accounts.
 *
 * The server-side middleware redirects any admin whose session has not reached
 * assurance level aal2 here. This page handles both cases without ever locking
 * an existing admin out:
 *   - No verified TOTP factor yet  → enrollment (scan QR, confirm a code).
 *   - A verified factor exists      → challenge (enter current code).
 *
 * On success the Supabase session is upgraded to aal2 and we send the admin on
 * to the dashboard, which the middleware now allows.
 */
export default function AdminMfaPage() {
  const supabase = useRef(createClient()).current
  const [mode, setMode] = useState<Mode>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Decide whether the admin needs to enroll a new factor or challenge an
  // existing one. Clean up any half-finished (unverified) TOTP factors first so
  // repeated visits don't pile up dangling enrollments.
  const bootstrap = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      window.location.assign('/login?redirect=/admin')
      return
    }

    const { data: factorsData, error: listErr } = await supabase.auth.mfa.listFactors()
    if (listErr) {
      setError('Could not load your security settings. Please try again.')
      setMode('enroll')
      return
    }

    const totp = factorsData?.totp ?? []
    const verified = totp.find((f) => f.status === 'verified')

    if (verified) {
      // Existing factor → challenge it.
      setFactorId(verified.id)
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: verified.id,
      })
      if (chErr || !ch) {
        setError('Could not start a verification challenge. Please try again.')
      } else {
        setChallengeId(ch.id)
      }
      setMode('challenge')
      return
    }

    // No verified factor → remove stale unverified ones, then enroll fresh.
    await Promise.all(
      totp
        .filter((f) => f.status !== 'verified')
        .map((f) => supabase.auth.mfa.unenroll({ factorId: f.id })),
    )

    const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `admin-totp-${Date.now()}`,
    })
    if (enrollErr || !enrollData) {
      setError(enrollErr?.message ?? 'Could not begin enrollment. Please try again.')
      setMode('enroll')
      return
    }
    setFactorId(enrollData.id)
    setQrCode(enrollData.totp.qr_code)
    setSecret(enrollData.totp.secret)
    setMode('enroll')
  }, [supabase])

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setSubmitting(true)
    setError(null)

    // For enrollment we must create a challenge on the spot; for the challenge
    // flow we already have one from bootstrap().
    let activeChallengeId = challengeId
    if (mode === 'enroll' || !activeChallengeId) {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr || !ch) {
        setSubmitting(false)
        setError('Could not verify the code. Please try again.')
        return
      }
      activeChallengeId = ch.id
    }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: activeChallengeId,
      code: code.trim(),
    })

    if (verifyErr) {
      setSubmitting(false)
      setError('That code was not correct. Check your authenticator app and try again.')
      setCode('')
      return
    }

    setMode('done')
    toast.success('Two-factor authentication verified')
    // Full-document navigation so the refreshed aal2 cookie is attached when the
    // middleware re-evaluates the /admin gate.
    window.location.assign('/admin')
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold tracking-tight text-foreground">
          {mode === 'challenge' ? 'Two-factor verification' : 'Secure your admin account'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {mode === 'challenge'
            ? 'Enter the 6-digit code from your authenticator app to continue to the dashboard.'
            : 'Admin access requires two-factor authentication. Scan the QR code with an authenticator app (1Password, Authy, Google Authenticator), then enter the 6-digit code to finish setup.'}
        </p>

        {mode === 'loading' && (
          <div className="mt-10 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading your security settings…
          </div>
        )}

        {mode === 'enroll' && qrCode && (
          <div className="mt-8 flex flex-col items-center gap-4 rounded-md border border-border bg-card p-6">
            {/* qr_code is an SVG data URL returned by Supabase. */}
            <img
              src={qrCode || '/placeholder.svg'}
              alt="Two-factor authentication QR code"
              className="size-44 rounded-md bg-white p-2"
              width={176}
              height={176}
            />
            {secret && (
              <div className="w-full text-center">
                <p className="text-xs text-muted-foreground">Or enter this key manually</p>
                <code className="mt-1 block break-all rounded bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                  {secret}
                </code>
              </div>
            )}
          </div>
        )}

        {(mode === 'enroll' || mode === 'challenge') && (
          <form onSubmit={handleVerify} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError(null)
                }}
                placeholder="000000"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" size="lg" disabled={submitting || code.length !== 6}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Verifying…
                </>
              ) : mode === 'challenge' ? (
                'Verify and continue'
              ) : (
                'Confirm and enable'
              )}
            </Button>
          </form>
        )}
      </div>
    </PageShell>
  )
}
