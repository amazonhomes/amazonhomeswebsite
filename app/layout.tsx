import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Suspense } from 'react'
import { StoreProvider } from '@/lib/store'
import { InactivityTimeout } from '@/components/auth/inactivity-timeout'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { getSiteUrl } from '@/lib/site'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: 'Amazon Homes — Detroit Wholesale Investment Properties',
    template: '%s — Amazon Homes',
  },
  description:
    'Off-market Detroit investment properties for serious buyers. Browse available deals, unlock protected photos and financials, submit offers, and request walkthroughs.',
  generator: 'v0.app',
  keywords: [
    'Detroit real estate',
    'wholesale properties',
    'investment properties',
    'off-market deals',
    'Michigan real estate',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Amazon Homes',
    title: 'Amazon Homes — Detroit Wholesale Investment Properties',
    description:
      'Off-market Detroit investment properties for serious buyers. Browse available deals, unlock protected photos and financials, submit offers, and request walkthroughs.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amazon Homes — Detroit Wholesale Investment Properties',
    description:
      'Off-market Detroit investment properties for serious buyers. Unlock protected photos and financials, submit offers, and request walkthroughs.',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1c2333',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${spaceGrotesk.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Suspense fallback={null}>
            <StoreProvider>
              {children}
              <InactivityTimeout />
            </StoreProvider>
          </Suspense>
          <Toaster position="top-center" />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
