import { NextResponse, type NextRequest } from "next/server"
import { updateSession } from "@/utils/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { ROUTES } from "@/lib/constants"


export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Dynamic pages that require nonce-based CSP (authenticated dashboard routes)
  // All other pages use 'unsafe-inline' since they are either static or don't handle user input
  // This approach ensures high security for sensitive areas while maintaining compatibility for static pages
  const dynamicPagePatterns = [
    /^\/dashboard/,           // Dashboard pages
    /^\/betriebskosten/,      // Operating costs
    /^\/finanzen/,            // Finance
    /^\/haeuser/,             // Houses
    /^\/wohnungen/,           // Apartments
    /^\/mieter/,              // Tenants
    /^\/todos/,               // Tasks
    /^\/mails/,               // Mails
    /^\/dateien/,             // Files
    /^\/checkout\/success/,   // Checkout success (needs Stripe verification)
    /^\/hilfe\/dokumentation\/[^/]+$/, // Dynamic documentation article pages (single article)
  ]

  const isDynamicPage = dynamicPagePatterns.some(pattern => pattern.test(pathname))

  // Create a nonce for CSP (only used for strict dynamic pages)
  const nonce = crypto.randomUUID()

  // Content Security Policy - nonces for dynamic pages, 'unsafe-inline' for static/landing pages
  const scriptSrc = isDynamicPage
    ? `script-src 'self' 'nonce-${nonce}' https://*.supabase.co https://*.stripe.com https://*.posthog.com`
    : `script-src 'self' 'unsafe-inline' https://*.supabase.co https://*.stripe.com https://*.posthog.com`

  const csp = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, // Keeping unsafe-inline for styles for now as removing it often breaks UI libs
    "img-src 'self' data: https://*.supabase.co https://*.stripe.com https://*.posthog.com",
    "connect-src 'self' https://*.supabase.co https://*.stripe.com https://api.stripe.com https://*.posthog.com",
    "font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai",
    "frame-src 'self' https://*.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  // Clone request headers and set nonce (only for dynamic pages) and CSP
  const requestHeaders = new Headers(request.headers)
  if (isDynamicPage) {
    requestHeaders.set('x-nonce', nonce)
  }
  requestHeaders.set('Content-Security-Policy', csp)

  // Initialize response
  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Content-Security-Policy', csp);

  // Update the session and get the user
  const { response: updatedResponse, user: sessionUser } = await updateSession(request, response)
  response = updatedResponse // Use the response from updateSession


  // Public routes that don't require authentication
  const publicRoutes = [
    '/', // Homepage
    '/robots.txt', // Robots.txt for SEO
    '/sitemap.xml', // Sitemap for SEO
    '/hilfe/dokumentation(.*)?', // All documentation routes under help
    '/dokumentation(.*)?', // Keep old path for backward compatibility
    '/auth(.*)?', // All auth routes
    '/_next(.*)?', // Next.js internal routes
    '/favicon.ico', // Favicon
    '/subscription-locked', // Subscription locked page
    '/api/stripe/plans', // Public API route for fetching plans
    '/api/posthog-config', // Public API route for PostHog
    '/api/dokumentation(.*)?', // Documentation API routes
    '/api/ai-assistant', // AI assistant API route
    '/datenschutz', // Datenschutz page
    '/agb', // AGB page
    '/impressum', // Impressum page
    '/loesungen(/.*)?', // All routes under loesungen
    '/funktionen(/.*)?', // All routes under funktionen
    '/warteliste(/.*)?', // All routes under warteliste
    '/preise' // Pricing page
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
    if (pathname.startsWith('/api/')) {
      // For API routes, return a JSON response indicating not authenticated
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    } else {
      // For non-API routes, redirect to login
      const url = new URL('/auth/login', request.url);
      // Only set redirect search param if it's not an auth route and not an _next route (already covered by non-API)
      if (!pathname.startsWith('/_next/')) { // No need to check /api/ here
        url.searchParams.set('redirect', pathname);
      }
      return NextResponse.redirect(url);
    }
  }

  // If the user is authenticated and trying to access auth routes (except login), redirect to home
  if (sessionUser && pathname.startsWith('/auth') && !pathname.startsWith('/auth/login')) {
    return NextResponse.redirect(new URL(ROUTES.HOME, request.url))
  }

  // Subscription check
  // This requires a Supabase client, so we create one here if needed.
  if (sessionUser &&
    !publicRoutes.some(route => {
      const regex = new RegExp(`^${route.replace(/\*/g, '.*')}$`);
      return regex.test(pathname);
    }) &&
    pathname !== '/subscription-locked' &&
    pathname !== '/api/stripe/checkout-session' // Exempt checkout session from subscription status check
  ) {
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
      console.error('Error fetching profile for subscription check:', profileError);
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Failed to fetch user profile for subscription status.', details: profileError.message }, { status: 500 });
      } else {
        const url = new URL('/', request.url); // Or a generic error page
        url.searchParams.set('error', 'profile_fetch_failed');
        return NextResponse.redirect(url);
      }
    } else if (!profile ||
      (profile.stripe_subscription_status !== 'active' &&
        profile.stripe_subscription_status !== 'trialing')) {
      if (pathname.startsWith('/api/')) {
        // For API routes, return a JSON response indicating subscription issue
        return NextResponse.json({ error: 'Subscription inactive or invalid. Please subscribe or manage your subscription.' }, { status: 403 });
      } else {
        // For non-API routes, redirect to subscription locked page
        const redirectUrl = new URL('/subscription-locked', request.url);
        // Add debug parameters
        if (!profile) {
          redirectUrl.searchParams.set('debug_profile_status', 'missing');
        } else {
          redirectUrl.searchParams.set('debug_profile_status', 'exists');
          redirectUrl.searchParams.set('debug_stripe_status', profile.stripe_subscription_status || 'null');
          // Trial fields removed - no longer using custom trial logic
        }
        return NextResponse.redirect(redirectUrl);
      }
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
     * - _vercel (Vercel specific files)
     */
    "/((?!_next/static|_next/image|_vercel|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
