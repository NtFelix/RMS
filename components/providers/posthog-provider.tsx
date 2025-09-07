'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'

// Only initialize PostHog in the browser and if the API key is available
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_KEY !== 'phc_placeholder_key') {
  // Check if PostHog is already initialized to avoid conflicts
  if (!posthog.__loaded) {
    console.log('Initializing PostHog with key:', process.env.NEXT_PUBLIC_POSTHOG_KEY.substring(0, 10) + '...');
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      capture_pageview: false, // We'll handle this manually
      persistence: 'localStorage',
      enable_recording_console_log: true,
      // Respect consent: start opted-out and rely on explicit opt-in
      opt_out_capturing_by_default: true,
      // Enable early access features
      bootstrap: {
        distinctID: undefined, // Will be set when user is identified
      },
      // Ensure feature flags are loaded
      loaded: function(posthog) {
        console.log('PostHog loaded successfully, reloading feature flags...');
        posthog.reloadFeatureFlags?.();
      }
    });
  }

  // Apply stored consent on load
  const consent = localStorage.getItem('cookieConsent');
  if (consent === 'all' && posthog.has_opted_out_capturing?.()) {
    console.log('Applying stored consent: opting in to PostHog tracking');
    posthog.opt_in_capturing();
    // Ensure feature flags are available right after opting in
    posthog.reloadFeatureFlags?.();
  } else if (consent !== 'all' && !posthog.has_opted_out_capturing?.()) {
    console.log('Applying stored consent: opting out of PostHog tracking');
    // Ensure we're opted-out if consent wasn't granted
    posthog.opt_out_capturing();
  }
} else if (typeof window !== 'undefined') {
  // Only log warning on client side
  console.warn('PostHog is not initialized. Environment check:', {
    hasWindow: typeof window !== 'undefined',
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ? process.env.NEXT_PUBLIC_POSTHOG_KEY.substring(0, 10) + '...' : 'undefined',
    posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    nodeEnv: process.env.NODE_ENV
  });
}

function PostHogTracking({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog.has_opted_in_capturing?.()) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  // Handle login tracking from auth callback
  useEffect(() => {
    const loginSuccess = searchParams.get('login_success')
    const provider = searchParams.get('provider')
    
    if (loginSuccess === 'true' && posthog.has_opted_in_capturing?.()) {
      // Get user info from Supabase client
      import('@/utils/supabase/client').then(({ createClient }) => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            // Identify user and track login event
            posthog.identify(user.id, {
              email: user.email,
              name: user.user_metadata?.name || '',
            })
            
            posthog.capture('user_logged_in', {
              provider: provider || 'email',
              last_sign_in: new Date().toISOString(),
            })
          }
        })
      })
      
      // Clean up URL params
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('login_success')
      newUrl.searchParams.delete('provider')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams])

  return <>{children}</>
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={children}>
        <PostHogTracking>{children}</PostHogTracking>
      </Suspense>
    </PHProvider>
  )
}
