'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AltAuth } from '@/components/auth/alt-auth'
import { PageShell } from '@/components/page-shell'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const explicitRedirect = params.get('redirect')
  const redirect = explicitRedirect || '/properties'
  const timedOut = params.get('timeout') === '1'
  const { login } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(email, password)
    if (result.ok) {
      toast.success('Welcome back')
      // Admins land on the dashboard unless they were sent here for a
      // specific protected page.
      const dest = result.role === 'admin' && !explicitRedirect ? '/admin' : redirect
      // Use a full-document navigation rather than router.push. The
      // destination (e.g. /admin) is gated by the server-side middleware,
      // which reads the auth cookie. A client-side push can reach the gate
      // before the just-written sign-in cookie is attached to the request,
      // bouncing the user back to /login. A top-level navigation guarantees
      // the cookie is sent, so the gate passes on the first try.
      window.location.assign(dest)
    } else {
      setSubmitting(false)
      setError(result.error ?? 'Unable to log in.')
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Login To Your Account
        </h1>
        <p className="mt-2 text-muted-foreground">
          Log in to view protected photos, financials, and manage your offers.
        </p>

        {timedOut && (
          <p
            role="status"
            className="mt-6 rounded-md border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground"
          >
            You were logged out due to inactivity for your security.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
             
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              required
            />
             <Link
                href="/forgot-password"
                className="text-sm font-medium text-foreground underline underline-offset-4"
              >
                Forgot password?
              </Link>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Logging in…
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </form>

       

        <p className="mt-6 text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Register for access
          </Link>
        </p>
      </div>
    </PageShell>
  )
}
