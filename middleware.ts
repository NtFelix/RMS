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

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/landing',
    '/modern/documentation',
    '/modern/documentation/.*', // Allow all sub-routes under documentation
    '/auth/.*', // Allow all auth routes
    '/_next/.*', // Allow Next.js internal routes
    '/favicon.ico', // Allow favicon
    '/subscription-locked', // Allow subscription locked page
  ]

  // If we're already on the login page, don't redirect
  if (pathname.startsWith('/auth/login')) {
    return response
  }

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!user && !publicRoutes.some(route => {
    const regex = new RegExp(`^${route.replace(/\*/g, '.*')}$`);
    return regex.test(pathname);
  })) {
    const url = new URL('/auth/login', request.url)
    // Only set redirect if it's not an auth route and not an API route
    if (!pathname.startsWith('/api/') && !pathname.startsWith('/_next/')) {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // If the user is authenticated and trying to access auth routes (except login), redirect to home
  if (user && pathname.startsWith('/auth') && !pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Subscription check
  if (user && !publicRoutes.some(route => {
    const regex = new RegExp(`^${route.replace(/\*/g, '.*')}$`);
    return regex.test(pathname);
  }) && pathname !== '/subscription-locked') {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      const url = new URL('/landing', request.url);
      url.searchParams.set('error', 'profile_fetch_failed');
      return NextResponse.redirect(url);
    } else if (profile && profile.stripe_subscription_status !== 'active') {
      return NextResponse.redirect(new URL('/subscription-locked', request.url));
    }
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
