import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"
import { createServerClient } from "@supabase/ssr"

export async function middleware(request: NextRequest) {
  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Update the session and get the user
  const { response: updatedResponse, user: sessionUser } = await updateSession(request, response)
  response = updatedResponse // Use the response from updateSession

  // Get the pathname from the URL
  const pathname = request.nextUrl.pathname

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
    '/api/stripe/plans', // Public API route for fetching plans
  ]

  // If we're already on the login page, don't redirect
  if (pathname.startsWith('/auth/login')) {
    return response
  }

  // If the user is not authenticated and trying to access a protected route, redirect to login
  if (!sessionUser && !publicRoutes.some(route => {
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
  if (sessionUser && pathname.startsWith('/auth') && !pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  // Subscription check
  // This requires a Supabase client, so we create one here if needed.
  if (sessionUser && !publicRoutes.some(route => {
    const regex = new RegExp(`^${route.replace(/\*/g, '.*')}$`);
    return regex.test(pathname);
  }) && pathname !== '/subscription-locked') {
    // Create a Supabase client only for this block if sessionUser exists
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name, value, options) {
            response.cookies.set(name, value, options);
          },
          remove(name, options) {
            response.cookies.set(name, '', options); // Or response.cookies.delete(name, options) if preferred
          },
        },
      }
    );

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_status')
      .eq('id', sessionUser.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      const url = new URL('/landing', request.url);
      url.searchParams.set('error', 'profile_fetch_failed');
      return NextResponse.redirect(url);
    } else if (!profile || (profile.stripe_subscription_status !== 'active' && profile.stripe_subscription_status !== 'trialing')) {
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
