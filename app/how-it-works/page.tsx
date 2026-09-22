import type { Metadata } from 'next'
import Link from 'next/link'
import { Calculator, FileSignature, KeyRound, LockOpen, Search, UserPlus } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'How to browse, unlock, and transact on off-market Detroit investment properties with Amazon Homes.',
}

const steps = [
  {
    icon: Search,
    title: 'Browse the inventory',
    body: 'Every listing shows the asking price, beds, baths, square footage, and a preview photo — no account required to look.',
  },
  {
    icon: UserPlus,
    title: 'Register for access',
    body: 'Create a free account with your name, email, and phone. You are instantly added to our verified buyers list.',
  },
  {
    icon: LockOpen,
    title: 'Unlock protected content',
    body: 'Interior photo galleries, showing instructions, and full deal financials become visible the moment you log in.',
  },
  {
    icon: Calculator,
    title: 'Run the numbers',
    body: 'Review ARV, estimated rehab, and the projected spread on every deal so you can underwrite quickly.',
  },
  {
    icon: FileSignature,
    title: 'Submit an offer',
    body: 'Send your price and terms directly from the property page. Our team reviews and follows up fast.',
  },
  {
    icon: KeyRound,
    title: 'Tour and close',
    body: 'Request a walkthrough, confirm your numbers, and close. Most deals are cash or hard-money, sold as-is.',
  },
]

export default function HowItWorksPage() {
  return (
    <PageShell>
      <section className="border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            How it works
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/80 text-pretty">
            A simple, transparent flow from browsing to closing. Protected photos
            and financials keep our deals off the open market and reserved for
            serious buyers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <step.icon className="size-5" />
                </span>
                <span className="font-display text-3xl font-bold text-border">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-lg bg-secondary p-8 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground text-balance">
            Get on the list and start underwriting today
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Create free account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/properties">Browse properties</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
