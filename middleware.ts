import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"

export async function middleware(request: NextRequest) {
  // Update the session
  const response = await updateSession(request)

  // Get the pathname from the URL
  const pathname = request.nextUrl.pathname

  // Check if the user is authenticated
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create a Supabase client
  const { createServerClient } = await import("@supabase/ssr")
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set() {}, // We don't need to set cookies in this middleware
      remove() {}, // We don't need to remove cookies in this middleware
    },
  })

  // Get the user from the session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!user && !pathname.startsWith("/auth")) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access auth routes, redirect to dashboard
  if (user && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
