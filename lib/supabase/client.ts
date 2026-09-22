import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // These are inlined at build time on Vercel and present at runtime in the browser.
  // During static prerender in environments where they aren't injected, fall back to
  // harmless placeholders so `createBrowserClient` can't throw and abort the whole build.
  // Any real request from such a client would fail loudly, which is the intended behavior.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"

  return createBrowserClient(url, anonKey, {
    // Secure cookies in production; not in dev, so localhost still works.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
  })
}
