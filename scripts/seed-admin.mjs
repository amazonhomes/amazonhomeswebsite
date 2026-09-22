import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("[v0] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN_EMAIL = "admin@amazonhomes.com"
const ADMIN_PASSWORD = "admin123"

async function main() {
  // Find an existing admin user (createUser is not idempotent).
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (listErr) throw listErr
  let user = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: "Amazon Homes Admin", phone: "(313) 555-0100", company: "Amazon Homes" },
    })
    if (error) throw error
    user = data.user
    console.log("[v0] Created admin auth user:", user.id)
  } else {
    // Ensure password + confirmation are known for the demo.
    await admin.auth.admin.updateUserById(user.id, { password: ADMIN_PASSWORD, email_confirm: true })
    console.log("[v0] Admin auth user already exists:", user.id)
  }

  // The handle_new_user trigger creates the profile; promote it to admin.
  const { error: upErr } = await admin
    .from("profiles")
    .update({ role: "admin", name: "Amazon Homes Admin", company: "Amazon Homes" })
    .eq("id", user.id)
  if (upErr) throw upErr

  console.log("[v0] Admin ready:", ADMIN_EMAIL, "/", ADMIN_PASSWORD)
}

main().catch((err) => {
  console.error("[v0] seed-admin failed:", err)
  process.exit(1)
})
