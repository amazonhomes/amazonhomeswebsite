import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  requireAdmin,
  verifyAdminPassword,
  writeAudit,
  normalizePhone,
  sanitizeName,
  sanitizeCompany,
} from "@/lib/admin-guard"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * PATCH /api/admin/users/[id] — edit a target account's non-sensitive profile
 * fields (name, phone, company) ONLY.
 *
 * Role, id, email, password, and any auth/MFA metadata are intentionally NOT
 * editable here — role changes are a separate privileged action, and this
 * endpoint never writes the `role` column (defense against mass-assignment).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin({ requireAal2: true })
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  let body: Record<string, unknown> = {}
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }

  // Build an allow-listed patch. Nothing outside these three fields is honored.
  const patch: { name?: string; phone?: string; company?: string } = {}
  if ("name" in body) {
    const name = sanitizeName(body.name)
    if (!name) return NextResponse.json({ error: "Enter a valid name." }, { status: 400 })
    patch.name = name
  }
  if ("phone" in body) patch.phone = normalizePhone(body.phone)
  if ("company" in body) patch.company = sanitizeCompany(body.company)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(patch).eq("id", id)
  if (error) {
    console.log("[v0] admin profile update failed:", error.message)
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "USER_UPDATED",
    recordId: id,
    status: "success",
  })

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/users/[id] — permanently delete an account.
 *
 * Requires admin + aal2 + fresh re-authentication of the current admin's
 * password. Enforced SERVER-SIDE (a hand-crafted request must fail too):
 *   - An admin cannot delete their own account (self-deletion protection).
 *   - The last remaining admin cannot be deleted (last-admin protection),
 *     checked against a live DB count, not a client value.
 *
 * Deleting the auth user cascades the profile row; related business records
 * (offers, showings) have their `user_id` SET NULL by FK, preserving history.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin({ requireAal2: true })
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  // Self-deletion protection — independent of any UI disabling.
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 },
    )
  }

  const rl = await checkRateLimit("adminDelete", `delete:${ctx.userId}`)
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
    // fall through; password will be empty and re-auth fails generically.
  }

  const reauthRl = await checkRateLimit("adminReauth", `reauth:${ctx.userId}`)
  if (!reauthRl.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    )
  }
  const reauthed = await verifyAdminPassword(ctx.email, String(body.password ?? ""))
  if (!reauthed) {
    return NextResponse.json({ error: "Your password could not be verified." }, { status: 403 })
  }

  const admin = createAdminClient()

  // Resolve the target's role to know which protections/audit action apply.
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ error: "This account no longer exists." }, { status: 404 })
  }

  // Last-admin protection, using a live server-side count.
  if (target.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "This account cannot be deleted because at least one administrator must remain." },
        { status: 400 },
      )
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(id)
  if (delErr) {
    console.log("[v0] admin delete user failed:", delErr.message)
    return NextResponse.json({ error: "Unable to complete this action." }, { status: 400 })
  }

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: target.role === "admin" ? "ADMIN_DELETED" : "USER_DELETED",
    recordId: id,
    status: "success",
  })

  return NextResponse.json({ ok: true })
}
