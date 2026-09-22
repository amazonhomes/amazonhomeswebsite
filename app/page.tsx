'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  Flame,
  Handshake,
  KeyRound,
  LockOpen,
  MapPin,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { PropertyCard } from '@/components/property-card'
import { Reveal } from '@/components/reveal'
import { TestimonialsCarousel } from '@/components/testimonials-carousel'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: Search,
    title: 'Browse deals',
    body: 'Explore off-market Detroit properties with real numbers — price, ARV, and rehab estimates.',
  },
  {
    icon: KeyRound,
    title: 'Create an account',
    body: 'Register in seconds to join our verified buyers list and unlock protected content.',
  },
  {
    icon: LockOpen,
    title: 'Unlock photos & financials',
    body: 'Registered investors see the full gallery, interior photos, and detailed deal breakdowns.',
  },
  {
    icon: ShieldCheck,
    title: 'Offer & tour',
    body: 'Submit an offer or request a walkthrough directly from the property page.',
  },
]

const stats = [
  { icon: Building2, value: '340+', label: 'Deals closed' },
  { icon: TrendingUp, value: '$52M', label: 'Investor volume' },
  { icon: Handshake, value: '1,800+', label: 'Verified buyers' },
  { icon: MapPin, value: '12', label: 'Detroit submarkets' },
]

const faqs = [
  {
    q: 'Why are photos and financials locked?',
    a: 'We keep interior photos and deal numbers behind a free account to protect our sellers and keep our buyers list qualified. Registering takes seconds and instantly unlocks the full gallery, ARV, and rehab estimates on every listing.',
  },
  {
    q: 'Does it cost anything to join the buyers list?',
    a: 'No. Creating an account and browsing unlocked deals is completely free. We only make money when a deal closes, so our incentive is to bring you accurate, profitable properties.',
  },
  {
    q: 'Are these properties on the MLS?',
    a: 'Most are off-market and never hit the MLS. We source directly from motivated sellers, wholesalers, and our own acquisitions pipeline, which is why the pricing leaves room for real spread.',
  },
  {
    q: 'How do I make an offer or schedule a showing?',
    a: 'Once registered, open any property and use the "Submit an offer" or "Request a showing" buttons. Your details are prefilled and our team follows up directly from the property page.',
  },
  {
    q: 'Do you work with out-of-state investors?',
    a: 'Absolutely. A large share of our buyers are remote. We provide detailed financials, photos, and coordinate local showings so you can invest in Detroit with confidence from anywhere.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="font-display text-base font-semibold text-foreground">
          {q}
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-secondary text-secondary-foreground transition-transform duration-300">
          {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
        </span>
      </button>
      <div
        className={cn(
          'grid transition-all duration-300 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
            {a}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { properties, offerCounts, testimonials } = useStore()
  const [featuredQuery, setFeaturedQuery] = useState('')
  const available = properties.filter((p) => p.status === 'available').length

  const listable = properties.filter((p) => p.status !== 'archived')

  // Top row: the 3 hottest deals — most submitted offers first (newest breaks ties).
  const hotDeals = [...listable]
    .sort((a, b) => {
      const diff = (offerCounts[b.id] ?? 0) - (offerCounts[a.id] ?? 0)
      if (diff !== 0) return diff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    .slice(0, 3)

  // Bottom row: the 3 newest listings, excluding any already shown as a hot deal.
  const hotIds = new Set(hotDeals.map((p) => p.id))
  const newListings = [...listable]
    .filter((p) => !hotIds.has(p.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

  const featuredSorted = [...hotDeals, ...newListings]

  // A property is flagged "New listing" if it is one of the newest listings overall,
  // independent of whether it also ranks as a hot deal.
  const newestIds = new Set(
    [...listable]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map((p) => p.id),
  )

  const q = featuredQuery.trim().toLowerCase()
  const featuredFiltered = q
    ? featuredSorted.filter((p) =>
        [p.address, p.neighborhood, p.zip, p.type]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q)),
      )
    : featuredSorted

  return (
    <PageShell>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        {/* Skyline photo: full-bleed faded on mobile, right-anchored on desktop */}
        <img
          src="/detroit-skyline.png"
          alt="Downtown Detroit skyline at sunset"
          className="absolute inset-0 size-full object-cover object-right opacity-20 md:opacity-100"
        />

        {/* Smooth S-curve divider (desktop) — dark panel with a soft depth layer and a bright edge accent */}
        <svg
          className="absolute inset-0 hidden size-full md:block"
          viewBox="0 0 1920 760"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Soft translucent underlay for depth, sitting just outside the main edge */}
          <path
            d="M0,0 L950,0 C1140,200 1010,500 850,760 L0,760 Z"
            fill="oklch(0.86 0.2 128)"
            fillOpacity="0.18"
          />
          {/* Main dark-green panel with a single gentle S-curve bulge */}
          <path
            d="M0,0 L883,0 C1080,200 950,490 787,760 L0,760 Z"
            fill="var(--primary)"
          />
          {/* Bright accent line tracing the curve */}
          <path
            d="M883,0 C1080,200 950,490 787,760"
            fill="none"
            stroke="oklch(0.85 0.21 128)"
            strokeWidth="4"
            strokeOpacity="0.9"
          />
        </svg>

        {/* Mobile readability gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/85 to-primary/60 md:hidden" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="md:max-w-[52%]">
            <span className="inline-flex items-center gap-2 rounded-sm bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
              Detroit, Michigan
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl md:text-6xl dark:text-white">
              Off-market investment properties built for serious buyers.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-primary-foreground/80 text-pretty">
              Amazon Homes sources deeply discounted Detroit deals. Browse the
              inventory, unlock protected photos and financials, and lock down
              your next flip or rental.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/properties">
                  View {available} Available Deals
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Join the Buyers List</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Featured deals
            </h2>
            <p className="mt-1 text-muted-foreground">
              Hand-picked opportunities moving fast.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={featuredQuery}
                onChange={(e) => setFeaturedQuery(e.target.value)}
                placeholder="Filter by address, area, type..."
                aria-label="Filter featured deals"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <Button variant="ghost" asChild className="hidden shrink-0 sm:inline-flex">
              <Link href="/properties">
                All properties <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
        {featuredFiltered.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredFiltered.map((property, i) => {
              const count = offerCounts[property.id] ?? 0
              const isHot = count > 0
              const isNew = newestIds.has(property.id)
              return (
                <Reveal key={property.id} delay={i * 90}>
                  <div className="relative">
                    {(isHot || isNew) && (
                      <div className="absolute -top-2 left-3 z-10 flex flex-col items-start gap-1">
                        {isHot && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground shadow-sm">
                            <Flame className="size-3.5" />
                            Hot · {count} {count === 1 ? 'offer' : 'offers'}
                          </span>
                        )}
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                            <Sparkles className="size-3.5" />
                            New listing
                          </span>
                        )}
                      </div>
                    )}
                    <PropertyCard property={property} />
                  </div>
                </Reveal>
              )
            })}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-card px-6 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <Search className="size-5" />
            </span>
            <p className="font-display text-lg font-semibold text-foreground">
              No featured deals match &ldquo;{featuredQuery.trim()}&rdquo;
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try a different address, neighborhood, or property type — or browse
              the full inventory.
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={() => setFeaturedQuery('')}>
                Clear filter
              </Button>
              <Button asChild>
                <Link href="/properties">
                  Browse all properties <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            How the buyer flow works
          </h2>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Photos and full financials are protected. Registering unlocks
            everything and adds you to our list for first access to new deals.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 90}
                className="flex flex-col gap-3 rounded-md border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-sm bg-primary text-primary-foreground">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-display text-2xl font-bold text-border">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About us */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16 scroll-mt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="relative">
            <div className="absolute -left-3 -top-3 hidden size-24 rounded-tl-2xl border-l-2 border-t-2 border-primary/40 sm:block" />
            <div className="absolute -bottom-3 -right-3 hidden size-24 rounded-br-2xl border-b-2 border-r-2 border-primary/40 sm:block" />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-xl ring-1 ring-border">
              <img
                src="/detroit-skyline.png"
                alt="The Detroit skyline at dusk"
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 backdrop-blur">
                <Building2 className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  Rooted in Detroit
                </span>
              </div>
            </div>
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
              About us
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
              A Detroit-rooted team sourcing deals worth building on.
            </h2>
            <div className="mt-6 space-y-4 border-l-2 border-primary/30 pl-5">
              <p className="text-muted-foreground text-pretty leading-relaxed">
                Amazon Homes was founded by lifelong Detroiters who spent
                years flipping and renting in the neighborhoods we now source
                from. We know these blocks, the contractors, and what it takes to
                turn a distressed property into a performing asset.
              </p>
              <p className="text-muted-foreground text-pretty leading-relaxed">
                Every listing is walked, underwritten, and priced with real spread
                in mind — so our buyers spend less time chasing bad numbers and
                more time closing.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group flex flex-col gap-3 bg-card p-6 transition-colors hover:bg-secondary"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <stat.icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
          <div className="grid gap-10 p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:p-12">
            <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Building2 className="size-11 text-primary" />
                </div>
                <span className="font-display text-3xl font-bold tracking-tight text-foreground">
                  Amazon Homes
                </span>
              </div>
              <div className="hidden h-px w-24 bg-primary/40 lg:block" />
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Our Mission
              </h3>
            </div>
            <div>
              <p className="text-muted-foreground text-pretty leading-relaxed">
                At <strong className="font-semibold text-foreground">Amazon Homes</strong>, we&apos;re
                dedicated to <strong className="font-semibold text-foreground">fueling</strong> the growth of{" "}
                <strong className="font-semibold text-foreground">real estate investors</strong> by providing
                exclusive, <strong className="font-semibold text-foreground">off-market deals</strong> with strong
                equity and <strong className="font-semibold text-foreground">high ROI</strong> potential. Our team
                specializes in sourcing undervalued properties, negotiating win-win terms, and delivering{" "}
                <strong className="font-semibold text-foreground">investment opportunities</strong> that align with
                your <strong className="font-semibold text-foreground">goals</strong>.
              </p>
              <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
                <strong className="font-semibold text-foreground">
                  Growing your portfolio, maximizing returns, and scaling confidently.
                </strong>{" "}
                Whether you&apos;re a seasoned investor or just getting started,{" "}
                <strong className="font-semibold text-foreground">we bring you vetted deals</strong>, clear numbers,
                and a streamlined acquisition process. Your next profitable deal starts here —{" "}
                <strong className="font-semibold text-foreground">let&apos;s build wealth together.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews & testimonials */}
      <section
        id="reviews"
        className="border-y border-border bg-secondary scroll-mt-20"
      >
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-foreground">
              Reviews & testimonials
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground text-balance">
              Investors who buy with us, keep buying with us.
            </h2>
            <p className="mt-2 text-muted-foreground">
              Real feedback from the buyers list — flippers, landlords, and
              out-of-state portfolios.
            </p>
          </div>
          <TestimonialsCarousel items={testimonials} />
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="mx-auto max-w-3xl px-4 py-16 scroll-mt-20">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
            FAQs
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground text-balance">
            Frequently asked questions
          </h2>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know before you register and start browsing.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((faq) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-balance md:text-3xl">
              Ready to see the full picture?
            </h2>
            <p className="mt-2 max-w-lg text-primary-foreground/80">
              Create a free account to unlock interior photos, deal financials,
              and the ability to submit offers.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild className="shrink-0">
            <Link href="/register">
              Get Access <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PageShell>
  )
}
