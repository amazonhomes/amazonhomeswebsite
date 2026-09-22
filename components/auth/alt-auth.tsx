'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  )
}

export function AltAuth({
  mode,
  redirect,
}: {
  mode: 'login' | 'register'
  redirect: string
}) {
  const router = useRouter()
  const { loginWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useStore()

  const [googleBusy, setGoogleBusy] = useState(false)
  const [googleUnavailable, setGoogleUnavailable] = useState(false)
  const [phoneUnavailable, setPhoneUnavailable] = useState(false)

  const [showPhone, setShowPhone] = useState(false)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function isProviderNotEnabled(message?: string) {
    const m = (message ?? '').toLowerCase()
    return (
      m.includes('provider is not enabled') ||
      m.includes('unsupported provider') ||
      m.includes('not enabled') ||
      m.includes('validation_failed')
    )
  }

  async function handleGoogle() {
    setGoogleBusy(true)
    setGoogleUnavailable(false)
    const result = await loginWithGoogle()
    if (!result.ok) {
      setGoogleBusy(false)
      if (isProviderNotEnabled(result.error)) {
        setGoogleUnavailable(true)
      } else {
        toast.error(result.error ?? 'Unable to continue with Google.')
      }
    }
    // On success the browser redirects to Google; nothing more to do here.
  }

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await sendPhoneOtp(phone, { name })
    setBusy(false)
    if (result.ok) {
      setStep('code')
      toast.success('Code sent — check your phone')
    } else if (isProviderNotEnabled(result.error)) {
      setPhoneUnavailable(true)
    } else {
      setError(result.error ?? 'Unable to send code.')
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await verifyPhoneOtp(phone, code)
    setBusy(false)
    if (result.ok) {
      toast.success(mode === 'register' ? 'Account created' : 'Welcome back')
      router.push(redirect)
    } else {
      setError(result.error ?? 'Unable to verify code.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={googleBusy}
        className="gap-2"
      >
        <GoogleIcon />
        {googleBusy ? 'Redirecting…' : 'Continue with Google'}
      </Button>

      {googleUnavailable && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Google sign-in isn&apos;t available yet. Please use your email and password for now, or
            try phone sign-in. This option will work as soon as it&apos;s enabled.
          </span>
        </div>
      )}

      {!showPhone ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setShowPhone(true)}
          className="gap-2"
        >
          <Phone className="size-4" />
          Continue with phone
        </Button>
      ) : step === 'phone' ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-3 rounded-md border border-border p-4">
          {mode === 'register' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone-name">Full name</Label>
              <Input
                id="phone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Investor"
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone-number">Phone number</Label>
            <Input
              id="phone-number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value)
                setError(null)
              }}
              placeholder="+15551234567"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use E.164 format including country code, e.g. +15551234567.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending code…' : 'Send code'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-3 rounded-md border border-border p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone-code">Enter the 6-digit code</Label>
            <Input
              id="phone-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setError(null)
              }}
              placeholder="123456"
              required
            />
            <p className="text-xs text-muted-foreground">
              Sent to <span className="font-medium text-foreground">{phone}</span>.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="flex-1">
              {busy ? 'Verifying…' : 'Verify & continue'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep('phone')
                setCode('')
                setError(null)
              }}
            >
              Back
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
