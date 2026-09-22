import { createClient } from "@supabase/supabase-js"

/**
 * SERVER-ONLY Supabase client authenticated with the service-role key.
 *
 * This client bypasses RLS and can call the GoTrue Admin API (create/delete
 * users, etc.), so it must NEVER be imported into a client component or any
 * code that ships to the browser. It lives in a `lib/supabase/admin.ts` module
 * that is only ever imported by route handlers under `app/api/admin/*`.
 *
 * The service-role key is read from a server-only env var and is never exposed
 * to the client, logged, or returned in a response.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    // Surfaced only in server logs; callers translate this into a generic
    // "Unable to complete this action." response so nothing internal leaks.
    throw new Error("Server is not configured for account management.")
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
