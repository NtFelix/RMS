'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'

function PostHogTracking() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog.has_opted_in_capturing?.()) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }

      const isAnonymous = posthog.get_distinct_id()?.startsWith('anonymous_');
      const isDocPage = pathname.startsWith('/dokumentation');

      posthog.capture('$pageview', {
        $current_url: url,
        user_type: isAnonymous ? 'anonymous' : 'authenticated',
        is_anonymous: isAnonymous,
        page_type: isDocPage ? 'documentation' : 'other'
      })
    }
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // This effect runs once on mount to initialize PostHog
    const initialize = async () => {
      if (typeof window === 'undefined' || posthog.__loaded) {
        return
      }

      let config = {
        key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
      };

      if (!config.key || config.key === 'phc_placeholder_key') {
        console.log('Client-side PostHog config not found, fetching from API...');
        try {
          const response = await fetch('/api/posthog-config');
          if (response.ok) {
            config = await response.json();
            console.log('PostHog config fetched from API');
          } else {
            console.warn('Failed to fetch PostHog config from API');
            return;
          }
        } catch (error) {
          console.error('Error fetching PostHog config:', error);
          return;
        }
      }

      if (!config.key || config.key === 'phc_placeholder_key') {
        console.warn('PostHog key is missing, aborting initialization.');
        return;
      }

      console.log('Initializing PostHog with key:', config.key.substring(0, 10) + '...');

      const isDocumentationPage = window.location.pathname.startsWith('/dokumentation') || window.location.pathname.startsWith('/landing');

      posthog.init(config.key, {
        api_host: config.host,
        capture_pageview: false, // We handle this manually in PostHogTracking
        persistence: 'localStorage',
        enable_recording_console_log: true,
        opt_out_capturing_by_default: !isDocumentationPage,
        opt_in_site_apps: true, // Enable Site Apps
        bootstrap: {
          distinctID: undefined,
        },
        loaded: (ph) => {
          console.log('PostHog loaded successfully, reloading feature flags...');
          ph.reloadFeatureFlags?.();

          // Apply consent after PostHog is fully loaded
          const consent = localStorage.getItem('cookieConsent');
          if (isDocumentationPage) {
            if (ph.has_opted_out_capturing?.()) {
              console.log('Enabling PostHog tracking for documentation page');
              ph.opt_in_capturing();
            }
          } else {
            if (consent === 'all' && ph.has_opted_out_capturing?.()) {
              console.log('Applying stored consent: opting in to PostHog tracking');
              ph.opt_in_capturing();
            } else if (consent !== 'all' && !ph.has_opted_out_capturing?.()) {
              console.log('Applying stored consent: opting out of PostHog tracking');
              ph.opt_out_capturing();
            }
          }
        }
      });

      // User Identification Logic
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const currentDistinctId = posthog.get_distinct_id();
        
        if (user) {
          if (!currentDistinctId || currentDistinctId !== user.id) {
            posthog.identify(user.id, {
              email: user.email,
              user_type: 'authenticated',
              is_anonymous: false,
            });
          }
        } else if (isDocumentationPage && !currentDistinctId?.startsWith('anonymous_')) {
          const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          posthog.identify(anonymousId, {
            user_type: 'anonymous',
            is_anonymous: true,
            first_seen: new Date().toISOString(),
            page_type: 'documentation'
          });
          posthog.capture('anonymous_user_documentation_access', {
            page: window.location.pathname,
            feature: 'documentation',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error handling user identification for PostHog:', error);
      }
    };

    initialize();
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogTracking />
      </Suspense>
      {children}
    </PHProvider>
  )
}