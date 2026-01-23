'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'

// Initialize PostHog with configuration
async function initializePostHog(nonce?: string) {
  if (typeof window === 'undefined' || posthog.__loaded) {
    return;
  }

  let config = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest' // Default to our proxy
  };

  // If host is a relative path, we need to make it absolute for the init call if needed, 
  // but posthog-js handles paths starting with / as relative to the current origin.
  if (config.host.startsWith('/')) {
    if (typeof window !== 'undefined') {
      config.host = window.location.origin + config.host;
    }
  }

  // If client-side env vars are not available, try to fetch from API
  if (!config.key || config.key === 'phc_placeholder_key') {
    console.log('Client-side PostHog config not found, fetching from API...');
    try {
      const response = await fetch('/api/posthog-config');
      if (response.ok) {
        const apiConfig = await response.json();
        config = apiConfig;
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
    // ... logic same as before ...
    console.warn('PostHog is not initialized. Environment check:', {
      hasWindow: typeof window !== 'undefined',
      posthogKey: config.key ? config.key.substring(0, 10) + '...' : 'undefined',
      posthogHost: config.host,
      nodeEnv: process.env.NODE_ENV
    });
    return;
  }

  console.log('Initializing PostHog with key:', config.key.substring(0, 10) + '...');

  // GDPR Compliance: Always require explicit consent before tracking
  // This applies to ALL pages including landing and documentation pages
  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false, // We'll handle this manually
    persistence: 'localStorage',
    enable_recording_console_log: false, // Disabled: don't capture console logs in session recordings
    // GDPR: Always opt-out by default, require explicit consent
    opt_out_capturing_by_default: true,
    nonce: nonce, // Add nonce for CSP
    // Enable early access features
    bootstrap: {
      distinctID: undefined, // Will be set when user is identified
    },
    // Ensure feature flags are loaded
    loaded: function (posthog: any) {
      console.log('PostHog loaded successfully, reloading feature flags...');
      posthog.reloadFeatureFlags?.();
    }
  } as any);

  // Apply stored consent on load - respects user choice on ALL pages
  const consent = localStorage.getItem('cookieConsent');
  // ... rest of consent logic same ...
  if (consent === 'all' && posthog.has_opted_out_capturing?.()) {
    console.log('Applying stored consent: opting in to PostHog tracking');
    posthog.opt_in_capturing();
    // Ensure feature flags are available right after opting in
    posthog.reloadFeatureFlags?.();
  } else if (consent !== 'all' && !posthog.has_opted_out_capturing?.()) {
    console.log('No consent or only necessary cookies accepted: ensuring tracking is disabled');
    // Ensure we're opted-out if consent wasn't granted
    posthog.opt_out_capturing();
  }
}

// Global initialization removed to support nonce passing from server

function PostHogTracking({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [consentGranted, setConsentGranted] = useState(false)

  // Listen for consent-granted event to trigger tracking immediately
  useEffect(() => {
    const handleConsentGranted = () => {
      console.log('Consent granted event received, triggering tracking...');
      setConsentGranted(prev => !prev); // Toggle to trigger effect re-runs
    };

    window.addEventListener('posthog-consent-granted', handleConsentGranted);
    return () => {
      window.removeEventListener('posthog-consent-granted', handleConsentGranted);
    };
  }, []);

  // Handle user identification based on auth state - ONLY if user has consented
  useEffect(() => {
    const handleUserIdentification = async () => {
      if (!posthog.__loaded) return;

      // GDPR: Only identify users if they have consented to tracking
      if (!posthog.has_opted_in_capturing?.()) {
        console.log('User has not consented to tracking, skipping identification');
        return;
      }

      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const currentDistinctId = posthog.get_distinct_id();

        if (user) {
          // User is authenticated - identify them if not already identified correctly
          if (!currentDistinctId || currentDistinctId !== user.id) {
            posthog.identify(user.id, {
              email: user.email,
              user_type: 'authenticated',
              is_anonymous: false,
            });
          }
        }
        // Note: Anonymous tracking for documentation pages removed for GDPR compliance
        // Users must accept cookies before any tracking occurs
      } catch (error) {
        console.error('Error handling user identification for PostHog:', error);
      }
    };

    handleUserIdentification();
  }, [pathname, consentGranted]); // Re-run when consent is granted

  // Track pageviews
  useEffect(() => {
    const trackPageview = async () => {
      if (!pathname || !posthog.has_opted_in_capturing?.()) return;

      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }

      // Determine user type by checking actual auth state
      let isAuthenticated = false;
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        isAuthenticated = !!user;
      } catch {
        // If we can't check auth, assume anonymous
        isAuthenticated = false;
      }

      const isDocPage = pathname.startsWith('/dokumentation');

      posthog.capture('$pageview', {
        $current_url: url,
        user_type: isAuthenticated ? 'authenticated' : 'anonymous',
        is_anonymous: !isAuthenticated,
        page_type: isDocPage ? 'documentation' : 'other'
      });
    };

    trackPageview();
  }, [pathname, searchParams, consentGranted]); // Re-run when consent is granted

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
            // Include user_type and is_anonymous for consistency with main identification
            posthog.identify(user.id, {
              email: user.email,
              name: user.user_metadata?.name || '',
              user_type: 'authenticated',
              is_anonymous: false,
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

export function PostHogProvider({ children, nonce }: { children: React.ReactNode, nonce?: string }) {
  const [isPostHogReady, setIsPostHogReady] = useState(false);

  useEffect(() => {
    // Check if PostHog is ready, and if not, try to initialize it
    const checkPostHogReady = async () => {
      if (posthog.__loaded) {
        setIsPostHogReady(true);
        return;
      }

      // Try to initialize if not already done, passing nonce
      await initializePostHog(nonce);

      // Check again after initialization attempt
      if (posthog.__loaded) {
        setIsPostHogReady(true);
      } else {
        // If still not ready, set a timeout to check again
        setTimeout(() => {
          if (posthog.__loaded) {
            setIsPostHogReady(true);
          }
        }, 1000);
      }
    };

    checkPostHogReady();
  }, [nonce]); // Re-run if nonce changes (unlikely)

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={children}>
        <PostHogTracking>{children}</PostHogTracking>
      </Suspense>
    </PHProvider>
  )
}
