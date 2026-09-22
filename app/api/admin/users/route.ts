import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  requireAdmin,
  verifyAdminPassword,
  writeAudit,
  sendAccountRecoveryEmail,
  generateTempPassword,
  isAllowedRole,
  normalizeEmail,
  normalizePhone,
  sanitizeName,
  sanitizeCompany,
} from "@/lib/admin-guard"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * POST /api/admin/users — create an Investor or Admin account.
 *
 * Authorization (re-derived from the session cookie, never from the body):
 *   - Valid admin session at assurance level aal2.
 *   - Creating an ADMIN additionally requires fresh re-authentication of the
 *     CURRENT admin's own password.
 *
 * The new account is created with email already confirmed and a throwaway
 * random password; the user then sets their own password via the existing
 * recovery flow. The admin never chooses or learns it. Role is constrained to
 * the closed {investor, admin} set — arbitrary role strings are rejected.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin({ requireAal2: true })
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard

  // Per-admin rate limit on account creation.
  const rl = await checkRateLimit("adminCreate", `create:${ctx.userId}`)
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    )
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }

  const role = body.role
  if (!isAllowedRole(role)) {
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }
  const email = normalizeEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }
  const name = sanitizeName(body.name)
  if (!name) {
    return NextResponse.json({ error: "Enter the account holder's name." }, { status: 400 })
  }
  const phone = normalizePhone(body.phone)
  const company = sanitizeCompany(body.company)

  // Creating another admin is highly privileged: require fresh re-authentication
  // of the CURRENT admin's password before proceeding.
  if (role === "admin") {
    const reauthRl = await checkRateLimit("adminReauth", `reauth:${ctx.userId}`)
    if (!reauthRl.success) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      )
    }
    const ok = await verifyAdminPassword(ctx.email, String(body.password ?? ""))
    if (!ok) {
      await writeAudit({
        actorId: ctx.userId,
        actorRole: ctx.role,
        action: "ADMIN_CREATED",
        recordId: null,
        status: "reauth_failed",
      })
      return NextResponse.json({ error: "Your password could not be verified." }, { status: 403 })
    }
  }

  const admin = createAdminClient()

  // Create the auth user (email pre-confirmed, throwaway password).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: generateTempPassword(),
    email_confirm: true,
    user_metadata: { name, phone, company },
  })

  if (createErr || !created?.user) {
    // GoTrue enforces unique emails; surface a friendly, non-enumerating-ish
    // message for the admin operator (who is already trusted) without leaking
    // internals.
    const msg = /already|registered|exists/i.test(createErr?.message ?? "")
      ? "An account with this email already exists."
      : "Unable to complete this action."
    console.log("[v0] admin create user failed:", createErr?.message)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = created.user.id

  // Synchronize the profile row (the on-signup trigger may have created it with
  // defaults). Set the role explicitly here via the service role, which is the
  // ONLY path allowed to assign a role — prevent_role_change still blocks any
  // role change attempted through a normal user session.
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert({ id: userId, email, name, phone, company, role }, { onConflict: "id" })

  if (profileErr) {
    // Roll back the auth user so we don't leave an account with no usable
    // profile/role behind.
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    console.log("[v0] admin profile upsert failed:", profileErr.message)
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }

  // Let the new user set their own password through the existing recovery flow.
  await sendAccountRecoveryEmail(email)

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: role === "admin" ? "ADMIN_CREATED" : "USER_CREATED",
    recordId: userId,
    status: "success",
  })

  return NextResponse.json({ ok: true, id: userId })
}
