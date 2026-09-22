'use client'

import { Mail, MapPin, Phone } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { ContactForm } from '@/components/forms/contact-form'

export default function ContactPage() {
  return (
    <PageShell>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
            Get in touch
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Tell us your buy box and we&apos;ll match you with deals before they
            hit the list. Questions about a specific property? Send them over.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <ContactCard
            icon={Phone}
            label="Phone"
            value="(313) 555-0100"
            href="tel:+13135550100"
          />
          <ContactCard
            icon={Mail}
            label="Email"
            value="deals@amazonhomes.com"
            href="mailto:deals@amazonhomes.com"
          />
          <ContactCard icon={MapPin} label="Location" value="Detroit, Michigan" />
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Office hours
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Monday–Friday · 9am–6pm ET
            </p>
            <p className="text-sm text-muted-foreground">Weekends by appointment</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="font-display text-xl font-bold text-foreground">
            Send us a message
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We typically respond within one business day.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </section>
    </PageShell>
  )
}

function ContactCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-accent">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  )
}
