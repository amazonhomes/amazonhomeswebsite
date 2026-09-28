import Link from 'next/link'
import type { Metadata } from 'next'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Link invalid or expired | Amazon Homes',
  robots: { index: false },
}

const MESSAGES = {
  email: {
    title: 'Verification link invalid or expired',
    body: 'This verification link is invalid or has expired. Please request a new verification email. If you already verified your email, you can sign in.',
    primary: { href: '/login', label: 'Go to sign in' },
    secondary: { href: '/register', label: 'Register again' },
  },
  recovery: {
    title: 'Reset link invalid or expired',
    body: 'This password reset link is invalid or has expired. Please request a new one.',
    primary: { href: '/forgot-password', label: 'Request a new reset link' },
    secondary: { href: '/login', label: 'Go to sign in' },
  },
  invite: {
    title: 'Invitation link invalid or expired',
    body: 'This invitation link is invalid, has already been used, or has expired. Contact Amazon Homes for a new invitation, or reset your password if you already set up your account.',
    primary: { href: '/login', label: 'Go to sign in' },
    secondary: { href: '/forgot-password', label: 'Reset password' },
  },
  generic: {
    title: 'Link invalid or expired',
    body: 'This link is invalid, has already been used, or has expired. Please request a new one.',
    primary: { href: '/login', label: 'Go to sign in' },
    secondary: { href: '/forgot-password', label: 'Reset password' },
  },
} as const

type Kind = keyof typeof MESSAGES

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const { type } = await searchParams
  const kind: Kind = type && type in MESSAGES ? (type as Kind) : 'generic'
  const msg = MESSAGES[kind]

  return (
    <PageShell>
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {msg.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{msg.body}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={msg.primary.href}>{msg.primary.label}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={msg.secondary.href}>{msg.secondary.label}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  )
}