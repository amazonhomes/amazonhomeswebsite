import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Admin invitations (inviteUserByEmail) return implicit-flow tokens in the URL
  // fragment (#access_token=…&type=invite), which never reaches the server, so
  // they arrive here with no `code` and no error. Forward with a fragment-less
  // Location so the browser carries the original fragment to the setup page,
  // which only accepts `type=invite` tokens. A query flag can't be used to mark
  // these because the v0 dev redirect proxy is allow-listed as an exact URL.
  if (!code && !searchParams.has("error") && !searchParams.has("error_code")) {
    return NextResponse.redirect(`${origin}/auth/setup-account`)
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}
