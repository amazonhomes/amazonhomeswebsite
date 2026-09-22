import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Secure cookies in production; not in dev, so localhost still works.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gate the admin dashboard server-side so it cannot be reached by direct URL.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // Unauthenticated visitors go to login.
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("redirect", request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
    // Authenticated non-admins (investors) are sent to the marketplace.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/properties"
      return NextResponse.redirect(url)
    }

    // Admin two-factor gate. Admin/VA accounts must reach assurance level aal2
    // (a verified TOTP factor confirmed this session) before touching the
    // dashboard. If they have not, send them to the enrollment/challenge page.
    // That page is itself under /admin, so it is excluded to avoid a redirect
    // loop — an unauthenticated or non-admin visitor still can't reach it
    // because both checks above run first.
    if (!request.nextUrl.pathname.startsWith("/admin/mfa")) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.currentLevel !== "aal2") {
        const url = request.nextUrl.clone()
        url.pathname = "/admin/mfa"
        url.search = ""
        return NextResponse.redirect(url)
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
