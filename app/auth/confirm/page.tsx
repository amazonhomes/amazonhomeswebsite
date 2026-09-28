'use client'

import Link from 'next/link'
import { Suspense, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type LinkKind = 'email' | 'recovery' | 'invite'

const KIND_BY_TYPE: Record<string, LinkKind> = {
  email: 'email',
  signup: 'email',
  recovery: 'recovery',
  invite: 'invite',
}

const DESTINATION: Record<LinkKind, string> = {
  email: '/properties',
  recovery: '/reset-password',
  invite: '/auth/setup-account',
}

const COPY: Record<LinkKind, { title: string; body: string; action: string }> = {
  email: {
    title: 'Confirm your email',
    body: 'Continue to verify your email address and access the Amazon Homes Investor Portal.',
    action: 'Verify email',
  },
  recovery: {
    title: 'Reset your password',
    body: 'Continue to choose a new password for your Amazon Homes account.',
    action: 'Continue',
  },
  invite: {
    title: 'Accept your invitation',
    body: 'Continue to set up your Amazon Homes Investor Portal account.',
    action: 'Continue',
  },
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmLink />
    </Suspense>
  )
}

/**
 * Landing page for Supabase email links built with `{{ .TokenHash }}`.
 *
 * The one-time token is verified only when the person clicks the button, never
 * on page load, so email security scanners that pre-fetch links (and React
 * dev double-effects) cannot consume it before the real click. `verifyOtp` with
 * a token hash is not tied to the browser that requested the email, so links
 * opened on another device or in an in-app browser still work.
 */
function ConfirmLink() {
  const params = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const tokenHash = params.get('token_hash')
  const rawType = params.get('type') ?? ''
  const kind: LinkKind | undefined = KIND_BY_TYPE[rawType]
  const [verifying, setVerifying] = useState(false)
  const attempted = useRef(false)

  if (!tokenHash || !kind) {
    return <InvalidLink kind={kind ?? 'email'} />
  }

  async function handleContinue() {
    if (attempted.current || !tokenHash || !kind) return
    attempted.current = true
    setVerifying(true)
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: rawType as EmailOtpType,
    })
    if (error) {
      window.location.replace(`/auth/error?type=${kind}`)
      return
    }
    window.location.replace(DESTINATION[kind])
  }

  const copy = COPY[kind]
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {copy.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{copy.body}</p>
        <Button size="lg" className="mt-8" onClick={handleContinue} disabled={verifying}>
          {verifying ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Verifying…
            </>
          ) : (
            copy.action
          )}
        </Button>
      </div>
    </PageShell>
  )
}

function InvalidLink({ kind }: { kind: LinkKind }) {
  const href = kind === 'recovery' ? '/forgot-password' : '/login'
  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Link invalid or incomplete
        </h1>
        <p className="mt-2 text-muted-foreground">
          This link is missing information. Please use the most recent email we sent you.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={href}>{kind === 'recovery' ? 'Request a new reset link' : 'Go to sign in'}</Link>
        </Button>
      </div>
    </PageShell>
  )
}