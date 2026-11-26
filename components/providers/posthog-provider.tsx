'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useReducer } from 'react'
import posthogProxyConfig from '@/lib/posthog-proxy'
import { syncSupportIdentity } from '@/lib/posthog-support'

const { POSTHOG_PROXY_PATH, POSTHOG_UI_HOST } = posthogProxyConfig

// GDPR: x-posthog-* tracing headers carry distinct/session IDs, so only send them (same origin) after opt-in.
function setTracingHeaders(enabled: boolean) {
  posthog.set_config({ tracing_headers: enabled ? [window.location.hostname] : [] });
}

// Initialize PostHog with configuration
async function initializePostHog(nonce?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  (window as any).posthog = posthog;

  if (posthog.__loaded) {
    return;
  }

  const pick = <T,>(...values: Array<T | undefined | null>) =>
    values.find((value) => value !== undefined && value !== null);

  const defaultHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || POSTHOG_PROXY_PATH;
  const defaultUiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || POSTHOG_UI_HOST;

  let config: {
    key?: string;
    host?: string;
    uiHost?: string;
  } = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: defaultHost,
    uiHost: defaultUiHost,
  };

  // If client-side env vars are not available, try to fetch from API
  if (!config.key || config.key === 'phc_placeholder_key') {
    console.log('Client-side PostHog config not found, fetching from API...');
    try {
      const response = await fetch('/api/posthog-config');
      if (response.ok) {
        const apiConfig = await response.json();
        config = {
          key: pick(apiConfig.key, apiConfig.apiKey, apiConfig.api_key, config.key),
          host: pick(apiConfig.host, apiConfig.apiHost, apiConfig.api_host, config.host),
          uiHost: pick(apiConfig.uiHost, apiConfig.ui_host, config.uiHost),
        };
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
      posthogUiHost: config.uiHost,
      nodeEnv: process.env.NODE_ENV
    });
    return;
  }

  // GDPR Compliance: Always require explicit consent before tracking
  // This applies to ALL pages including landing and documentation pages
  posthog.init(config.key, {
    api_host: config.host,
    ui_host: config.uiHost,
    capture_pageview: false, // We'll handle this manually
    capture_pageleave: false, // We'll handle this manually along with pageview
    persistence: 'localStorage',
    enable_recording_console_log: false, // Disabled: don't capture console logs in session recordings
    // GDPR: Always opt-out by default, require explicit consent
    opt_out_capturing_by_default: true,
    // GDPR: Visitors without consent are still counted anonymously. No cookies or
    // storage are used; PostHog keeps a server-side privacy-preserving hash instead.
    cookieless_mode: 'on_reject',
    // Only identified users get person profiles; anonymous events stay personless.
    person_profiles: 'identified_only',
    // Browsers with "Do Not Track" stay anonymous even after explicit opt-in.
    respect_dnt: true,
    nonce: nonce, // Add nonce for CSP
    // Enable early access features
    bootstrap: {
      distinctID: undefined, // Will be set when user is identified
    },
    // Ensure feature flags are loaded
    loaded: function (posthogInstance: any) {
      posthogInstance.reloadFeatureFlags?.();
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

  // Also covers returning visitors whose opt-in is already persisted (branch above not entered)
  setTracingHeaders(consent === 'all' && !posthog.has_opted_out_capturing?.());
  window.dispatchEvent(new CustomEvent('posthog-initialized'));
}

// Global initialization removed to support nonce passing from server

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const getParam = searchParams ? searchParams.get.bind(searchParams) : null
  const [consentTrigger, triggerConsent] = useReducer((s) => s + 1, 0)

  // Listen for consent-granted and posthog-initialized events to trigger tracking immediately
  useEffect(() => {
    const handleConsentGranted = () => {
      setTracingHeaders(Boolean(posthog.has_opted_in_capturing?.()));
      console.log('Consent granted event received, triggering tracking...');
      triggerConsent();
    };

    const handleInitialized = () => {
      triggerConsent();
    };

    window.addEventListener('posthog-consent-granted', handleConsentGranted);
    window.addEventListener('posthog-initialized', handleInitialized);
    return () => {
      window.removeEventListener('posthog-consent-granted', handleConsentGranted);
      window.removeEventListener('posthog-initialized', handleInitialized);
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

          // Sync the PostHog Support identity so tickets follow the user across browsers/devices.
          await syncSupportIdentity(posthog, user.id)
        }
      } catch (error) {
        console.error('Error handling user identification for PostHog:', error);
      }
    };

    handleUserIdentification();
  }, [pathname, consentTrigger]);

  // Track pageviews and pageleaves
  useEffect(() => {
    let currentIsAuthenticated = false;

    const trackPageview = async () => {
      // is_capturing() also covers visitors without consent: with cookieless_mode
      // "on_reject" they are tracked anonymously, so their pageviews count too.
      if (!posthog.__loaded || !pathname || !posthog.is_capturing?.()) return;

      let url = window.origin + pathname;
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }

      // Anonymous visitors skip the auth lookup: without consent they stay
      // anonymous in PostHog, so the authenticated label would not apply anyway.
      if (posthog.has_opted_in_capturing?.()) {
        try {
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          currentIsAuthenticated = !!user;
        } catch {
          currentIsAuthenticated = false;
        }
      }

      posthog.capture('$pageview', {
        $current_url: url,
        user_type: currentIsAuthenticated ? 'authenticated' : 'anonymous',
        is_anonymous: !currentIsAuthenticated,
      });
    };

    trackPageview();

    return () => {
      if (posthog.__loaded && pathname && posthog.is_capturing?.()) {
        let url = window.origin + pathname;
        if (searchParams.toString()) {
          url = url + `?${searchParams.toString()}`;
        }
        posthog.capture('$pageleave', {
          $current_url: url,
          user_type: currentIsAuthenticated ? 'authenticated' : 'anonymous',
          is_anonymous: !currentIsAuthenticated,
        });
      }
    };
  }, [pathname, searchParams, consentTrigger]);

  // Handle login tracking from auth callback
  useEffect(() => {
    if (!getParam || !posthog.__loaded) return
    
    const loginSuccess = getParam('login_success')
    const provider = getParam('provider')

    if (loginSuccess === 'true' && posthog.has_opted_in_capturing?.()) {
      import('@/utils/supabase/client').then(({ createClient }) => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            posthog.identify(user.id, {
              email: user.email,
              name: user.user_metadata?.name || '',
              user_type: 'authenticated',
              is_anonymous: false,
            })

            void syncSupportIdentity(posthog, user.id)

            posthog.capture('user_logged_in', {
              provider: provider || 'email',
              last_sign_in: new Date().toISOString(),
            })
          }
        })
      })

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('login_success')
      newUrl.searchParams.delete('provider')
      window.history.replaceState({}, '', newUrl.toString())
    }
  }, [searchParams, consentTrigger])

  return null
}

export function PostHogProvider({ children, nonce }: { children: React.ReactNode, nonce?: string }) {
  useEffect(() => {
    if (posthog.__loaded) return;
    void initializePostHog(nonce);
  }, [nonce]);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
