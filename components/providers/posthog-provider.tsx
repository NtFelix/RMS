'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, useState } from 'react'

// Initialize PostHog with configuration
async function initializePostHog() {
  if (typeof window === 'undefined' || posthog.__loaded) {
    return;
  }

  let config = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
  };

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
    console.warn('PostHog is not initialized. Environment check:', {
      hasWindow: typeof window !== 'undefined',
      posthogKey: config.key ? config.key.substring(0, 10) + '...' : 'undefined',
      posthogHost: config.host,
      nodeEnv: process.env.NODE_ENV
    });
    return;
  }

  console.log('Initializing PostHog with key:', config.key.substring(0, 10) + '...');
  
  // Check if we're on a public documentation page
  const isDocumentationPage = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/dokumentation') || 
     window.location.pathname === '/');
  
  posthog.init(config.key, {
    api_host: config.host,
    capture_pageview: false, // We'll handle this manually
    persistence: 'localStorage',
    enable_recording_console_log: true,
    // For documentation pages, allow anonymous tracking; otherwise require consent
    opt_out_capturing_by_default: !isDocumentationPage,
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

  // Apply stored consent on load
  const consent = localStorage.getItem('cookieConsent');
  
  if (isDocumentationPage) {
    // For documentation pages, always allow basic tracking for anonymous users
    if (posthog.has_opted_out_capturing?.()) {
      console.log('Enabling PostHog tracking for documentation page');
      posthog.opt_in_capturing();
      posthog.reloadFeatureFlags?.();
    }
  } else {
    // For other pages, respect cookie consent
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
  }
}

// Initialize PostHog when the module loads (client-side only)
if (typeof window !== 'undefined') {
  initializePostHog();
}

function PostHogTracking({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Handle user identification based on auth state
  useEffect(() => {
    const handleUserIdentification = async () => {
      if (!posthog.__loaded) return;

      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        const currentDistinctId = posthog.get_distinct_id();
        const isDocumentationPage = pathname?.startsWith('/dokumentation') || pathname === '/';
        
        if (user) {
          // User is authenticated - identify them if not already identified correctly
          if (!currentDistinctId || currentDistinctId !== user.id) {
            posthog.identify(user.id, {
              email: user.email,
              user_type: 'authenticated',
              is_anonymous: false,
            });
          }
        } else if (isDocumentationPage && !currentDistinctId?.startsWith('anonymous_')) {
          // User is not authenticated and on documentation page - assign anonymous ID
          const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          posthog.identify(anonymousId, {
            user_type: 'anonymous',
            is_anonymous: true,
            first_seen: new Date().toISOString(),
            page_type: 'documentation'
          });
          
          // Track anonymous documentation access
          posthog.capture('anonymous_user_documentation_access', {
            page: pathname,
            feature: 'documentation',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error handling user identification for PostHog:', error);
      }
    };

    handleUserIdentification();
  }, [pathname]);

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog.has_opted_in_capturing?.()) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + `?${searchParams.toString()}`
      }
      
      // Check if this is an anonymous user on documentation
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
  const [isPostHogReady, setIsPostHogReady] = useState(false);

  useEffect(() => {
    // Check if PostHog is ready, and if not, try to initialize it
    const checkPostHogReady = async () => {
      if (posthog.__loaded) {
        setIsPostHogReady(true);
        return;
      }

      // Try to initialize if not already done
      await initializePostHog();
      
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
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={children}>
        <PostHogTracking>{children}</PostHogTracking>
      </Suspense>
    </PHProvider>
  )
}
