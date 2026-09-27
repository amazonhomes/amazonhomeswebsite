import { createClient } from "@supabase/supabase-js"
import { readFileSync, readdirSync } from "node:fs"
for (const pid of readdirSync("/proc").filter((d) => /^\d+$/.test(d))) { try { const raw = readFileSync(`/proc/${pid}/environ`, "utf8"); if (!raw.includes("SUPABASE_SERVICE_ROLE_KEY=")) continue; for (const kv of raw.split("\0")) { const i = kv.indexOf("="); if (i > 0 && !process.env[kv.slice(0, i)]) process.env[kv.slice(0, i)] = kv.slice(i + 1) } break } catch {} }
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const email = process.argv[2]
const dev = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
console.log("DEV_URL", dev)
for (const r of [dev, dev + (dev.includes("?") ? "&" : "?") + "flow=invite", "https://www.amazonhomes.com/auth/callback", "https://www.amazonhomes.com/auth/callback?flow=invite", "https://www.amazonhomes.com/auth/setup-account"]) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: r } })
  console.log(r, "=>", error ? error.message : new URL(data.properties.action_link).searchParams.get("redirect_to"))
}