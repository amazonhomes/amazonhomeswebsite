/**
 * Canonical, absolute base URL for the site.
 *
 * Order of preference:
 * 1. NEXT_PUBLIC_SITE_URL — set this to the custom production domain when one exists.
 * 2. VERCEL_PROJECT_PRODUCTION_URL — the stable production domain Vercel injects.
 * 3. VERCEL_URL — the per-deployment URL (preview deployments).
 * 4. localhost — local development fallback.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, "")

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (prod) return `https://${prod}`

  const deployment = process.env.VERCEL_URL
  if (deployment) return `https://${deployment}`

  return "http://localhost:3000"
}

/**
 * Absolute base URL that Supabase auth emails (password recovery, sign-up
 * confirmation) must redirect back to.
 *
 * `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is the v0 preview redirect proxy. It
 * lets auth callbacks reach the sandboxed preview inside the v0 iframe, but it
 * is a PROTECTED Vercel deployment — using it in production sends real users to
 * Vercel's deployment-protection ("Request Sent — Team owners emailed") screen
 * instead of the reset page. So the dev proxy is used ONLY outside production;
 * in production we always route through the canonical public site URL.
 */
export function getAuthCallbackUrl(): string {
  if (process.env.VERCEL_ENV !== "production") {
    const devProxy = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
    if (devProxy) return devProxy
  }
  return `${getSiteUrl()}/auth/callback`
}

/**
 * Client-safe variant of getAuthCallbackUrl for browser code (the sign-up
 * email-confirmation and Google OAuth flows in lib/store.tsx).
 *
 * Server-only env (VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL) is NOT exposed to
 * the browser, so this decides using the NEXT_PUBLIC_* vars only. When
 * NEXT_PUBLIC_SITE_URL is configured — which is the case in production, where it
 * is set to the canonical custom domain — auth emails ALWAYS return to that
 * domain and NEVER to the protected dev proxy, even if the app is reached via a
 * raw *.vercel.app alias. Only when NEXT_PUBLIC_SITE_URL is absent (v0 sandbox,
 * preview, local dev) do we fall back to the dev redirect proxy so callbacks
 * reach the sandboxed preview inside the iframe.
 */
export function getClientAuthCallbackUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (siteUrl) return `${siteUrl}/auth/callback`

  const devProxy = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  if (devProxy) return devProxy

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/auth/callback`
}
