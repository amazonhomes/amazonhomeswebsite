import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

/** Only same-origin relative paths are honored, never `//host` or absolute URLs. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/"
  }
  return value
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))
  const failureType = next === "/reset-password" ? "recovery" : "email"

  // Token-hash email links (the recommended templates) are verified on
  // /auth/confirm behind an explicit click. Forward them there untouched so the
  // one-time token is never consumed by this GET (link scanners, prefetch).
  const tokenHash = searchParams.get("token_hash")
  if (tokenHash) {
    const confirm = new URL("/auth/confirm", origin)
    confirm.searchParams.set("token_hash", tokenHash)
    confirm.searchParams.set("type", searchParams.get("type") ?? "")
    return NextResponse.redirect(confirm)
  }

  // Supabase reports an already-used or expired link with error params.
  if (searchParams.has("error") || searchParams.has("error_code")) {
    return NextResponse.redirect(`${origin}/auth/error?type=${failureType}`)
  }

  // Legacy PKCE links and Google OAuth. The code is exchanged exactly once here;
  // on success the destination page reuses the resulting session cookie.
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error("[auth/callback] Code exchange failed:", error.code ?? error.name)
    return NextResponse.redirect(`${origin}/auth/error?type=${failureType}`)
  }

  // Admin invitations (inviteUserByEmail) sent with the default template return
  // implicit-flow tokens in the URL fragment (#access_token=…&type=invite), which
  // never reaches the server, so they arrive here with no `code` and no error.
  // Forward with a fragment-less Location so the browser carries the original
  // fragment to the setup page, which only accepts `type=invite` tokens.
  return NextResponse.redirect(`${origin}/auth/setup-account`)
}
