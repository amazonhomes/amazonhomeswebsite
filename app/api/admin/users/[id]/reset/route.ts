import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  requireAdmin,
  verifyAdminPassword,
  writeAudit,
  sendAccountRecoveryEmail,
} from "@/lib/admin-guard"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * POST /api/admin/users/[id]/reset — send a password-reset email to a target
 * account using the EXISTING self-service recovery flow.
 *
 * Requires admin + aal2 + fresh re-authentication of the current admin's
 * password. The admin never sees or sets the target's password and never
 * receives the recovery token/link. Resetting a password never touches the
 * target's role or MFA enrollment — their normal login (password -> TOTP ->
 * aal2) is unchanged.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin({ requireAal2: true })
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { ctx } = guard
  const { id } = await params

  const rl = await checkRateLimit("adminReset", `reset:${ctx.userId}:${id}`)
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
    // fall through; re-auth will fail generically on empty password.
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

  // Resolve the target's email server-side from its id (never trust a
  // client-supplied email — prevents sending resets to arbitrary addresses).
  const admin = createAdminClient()
  const { data: target } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .maybeSingle()
  if (!target?.email) {
    return NextResponse.json({ error: "This account no longer exists." }, { status: 404 })
  }

  await sendAccountRecoveryEmail(target.email as string)

  await writeAudit({
    actorId: ctx.userId,
    actorRole: ctx.role,
    action: "PASSWORD_RESET_REQUESTED",
    recordId: id,
    status: "success",
  })

  return NextResponse.json({ ok: true })
}
