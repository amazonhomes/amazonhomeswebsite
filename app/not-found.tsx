import Link from 'next/link'
import { Home, Search } from 'lucide-react'
import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-display text-7xl font-bold tracking-tight text-accent sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          This property isn&apos;t on the market
        </h1>
        <p className="mt-3 text-muted-foreground">
          The page you&apos;re looking for may have been sold, moved, or never
          existed. Let&apos;s get you back to the deals.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="size-4" /> Back home
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/properties">
              <Search className="size-4" /> Browse properties
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  )
}
