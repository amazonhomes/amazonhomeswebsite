import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { NewsletterSignup } from '@/components/newsletter-signup'

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-sm bg-accent text-accent-foreground">
              <Building2 className="size-5" />
            </span>
            <span className="font-display text-base font-bold tracking-tight">
              Amazon Homes
            </span>
          </div>
          <p className="text-sm text-primary-foreground/70">
            Off-market Detroit investment properties for serious cash buyers and
            long-term holders.
          </p>
          <div className="mt-2">
            <NewsletterSignup />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Explore
          </h3>
          <Link href="/properties" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            All Properties
          </Link>
          <Link href="/how-it-works" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            How It Works
          </Link>
          <Link href="/register" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            Join Buyers List
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Company
          </h3>
          <Link href="/contact" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            Contact
          </Link>
          <Link href="/login" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            Investor Login
          </Link>
          <Link href="/admin" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            Admin Portal
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
            Contact
          </h3>
          <p className="text-sm text-primary-foreground/70">Detroit, Michigan</p>
          <a href="tel:+13135550100" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            (313) 555-0100
          </a>
          <a href="mailto:deals@amazonhomes.com" className="text-sm text-primary-foreground/70 hover:text-primary-foreground">
            deals@amazonhomes.com
          </a>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-primary-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Amazon Homes. All rights reserved.</p>
          <p>
            All properties sold as-is. Figures are estimates for informational
            purposes only and not investment advice.
          </p>
        </div>
      </div>
    </footer>
  )
}
