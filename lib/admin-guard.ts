import "server-only"

import { createClient as createSsrClient } from "@/lib/supabase/server"
import { createClient as createPlainClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthCallbackUrl } from "@/lib/site"

/**
 * Server-side authorization + audit helpers for privileged account management.
 *
 * Every privileged endpoint independently re-derives trust from the request's
 * own session cookie — it NEVER trusts a role, `isAdmin`, or `passwordVerified`
 * value coming from the client. `/api/admin/*` routes are not behind the
 * middleware admin gate (that only covers page paths under `/admin`), so these
 * checks are the sole line of defense for the API surface.
 */

export type AdminContext = {
  /** auth.users id of the calling admin. */
  userId: string
  /** Verified role from the DB profile (always "admin" past the guard). */
  role: string
  /** Email from the DB profile, used for re-authentication. */
  email: string
  /** Cookie-bound client for the caller (RLS applies). */
  supabase: SupabaseClient
}

export type GuardFailure = { ok: false; status: number; error: string }
export type GuardSuccess = { ok: true; ctx: AdminContext }

/**
 * Require a valid, authenticated ADMIN session. When `requireAal2` is true
 * (the default) the session must additionally have satisfied its TOTP factor
 * this session (assurance level aal2) — the same bar the middleware enforces
 * for the dashboard UI, re-checked here so a raw API call can't bypass it.
 */
export async function requireAdmin(
  { requireAal2 = true }: { requireAal2?: boolean } = {},
): Promise<GuardSuccess | GuardFailure> {
  const supabase = await createSsrClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: "You must be signed in." }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile || profile.role !== "admin") {
    return { ok: false, status: 403, error: "You are not authorized to perform this action." }
  }

  if (requireAal2) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (!aal || aal.currentLevel !== "aal2") {
      return { ok: false, status: 403, error: "Two-factor verification is required for this action." }
    }
  }

  return {
    ok: true,
    ctx: { userId: user.id, role: profile.role, email: profile.email as string, supabase },
  }
}

/**
 * Perform REAL Supabase re-authentication of the current admin's password.
 *
 * Uses a throwaway client with `persistSession: false`, so verifying the
 * password never mutates the caller's real session cookies (no accidental
 * downgrade to aal1, no token churn). The password is only ever passed to
 * Supabase for verification — never stored, logged, or echoed back.
 *
 * Returns true only on a successful credential check. Any error (wrong
 * password, rate limit, network) returns false; callers translate that into a
 * generic "Your password could not be verified." response.
 */
export async function verifyAdminPassword(email: string, password: string): Promise<boolean> {
  if (!password || typeof password !== "string") return false
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return false

  const client = createPlainClient(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  // Immediately discard any session the verification produced.
  if (data?.session) {
    await client.auth.signOut().catch(() => {})
  }
  return !error && !!data?.user
}

/**
 * Trigger the EXISTING self-service password-recovery flow for an address.
 *
 * Reused for both admin-created accounts (so the new user sets their own
 * password — the admin never chooses or learns it) and the admin-initiated
 * "Send password reset" action. Routes through the same v0 redirect proxy +
 * `/auth/callback` -> `/reset-password` path as `/api/recover`. Best-effort and
 * silent: an unknown address, a send failure, and a success are indistinguishable
 * to the caller, and no token or reset URL is ever logged or returned.
 */
export async function sendAccountRecoveryEmail(email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!url || !anon) return
  const redirectTo = appendNext(getAuthCallbackUrl(), "/reset-password")
  try {
    const client = createPlainClient(url, anon, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.resetPasswordForEmail(email, { redirectTo })
  } catch {
    // Swallow — never leak provider/auth errors.
  }
}

function appendNext(base: string, next: string): string {
  try {
    const u = new URL(base)
    u.searchParams.set("next", next)
    return u.toString()
  } catch {
    const sep = base.includes("?") ? "&" : "?"
    return `${base}${sep}next=${encodeURIComponent(next)}`
  }
}

/**
 * Generate a high-entropy temporary password for a freshly created account.
 * It is never returned to anyone — the user replaces it via the recovery email
 * before their first sign-in — so it exists only to satisfy the auth layer's
 * requirement that every user row have a password.
 */
export function generateTempPassword(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const body = Buffer.from(bytes).toString("base64").replace(/[^a-zA-Z0-9]/g, "")
  // Guarantee mixed classes regardless of the random base64 content.
  return `Aa1!${body}`
}

/** Supported, closed set of roles. Never accept an arbitrary role string. */
export const ALLOWED_ROLES = ["investor", "admin"] as const
export type AllowedRole = (typeof ALLOWED_ROLES)[number]

export function isAllowedRole(value: unknown): value is AllowedRole {
  return typeof value === "string" && (ALLOWED_ROLES as readonly string[]).includes(value)
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}

/** Light phone normalization: keep digits and a single leading +, cap length.
 *  Empty is allowed (phone is optional at the auth layer). */
export function normalizePhone(value: unknown): string {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  if (!trimmed) return ""
  const plus = trimmed.startsWith("+") ? "+" : ""
  const digits = trimmed.replace(/[^\d]/g, "").slice(0, 15)
  return digits ? `${plus}${digits}` : ""
}

export function sanitizeName(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, 120)
}

export function sanitizeCompany(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, 160)
}

/**
 * Append a row to the append-only audit trail using the service-role client
 * (so the write succeeds regardless of RLS). Only NON-SENSITIVE metadata is
 * recorded: actor, target id, action, and status — never passwords, tokens,
 * hashes, MFA secrets, or reset links. Best-effort: a logging failure must not
 * abort the privileged operation it describes.
 */
export async function writeAudit(entry: {
  actorId: string | null
  actorRole: string | null
  action: string
  recordId: string | null
  status: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      table_name: "profiles",
      record_id: entry.recordId,
      status: entry.status,
    })
  } catch (err) {
    console.log("[v0] audit log write failed:", (err as Error)?.message)
  }
}
