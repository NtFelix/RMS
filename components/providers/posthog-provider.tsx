'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

// Only initialize PostHog in the browser and if the API key is available
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false, // We'll handle this manually
    persistence: 'localStorage',
    enable_recording_console_log: true,
    // Respect consent: start opted-out and rely on explicit opt-in
    opt_out_capturing_by_default: true,
  });

  // Apply stored consent on load
  const consent = localStorage.getItem('cookieConsent');
  if (consent === 'all' && posthog.has_opted_out_capturing?.()) {
    posthog.opt_in_capturing();
    // Ensure feature flags are available right after opting in
    posthog.reloadFeatureFlags?.();
  } else if (consent !== 'all' && !posthog.has_opted_out_capturing?.()) {
    // Ensure we're opted-out if consent wasn't granted
    posthog.opt_out_capturing();
  }
} else if (process.env.NODE_ENV === 'development') {
  console.warn('PostHog is not initialized. Make sure to set NEXT_PUBLIC_POSTHOG_KEY in your environment variables.');
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
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

  return <PHProvider client={posthog}>{children}</PHProvider>
}
