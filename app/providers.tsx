'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

import React from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    posthog.init('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
      api_host: 'https://eu.i.posthog.com',
      capture_pageview: false, // we will capture the pageview manually after consent is given
    });
    if (consent === 'true') {
      posthog.opt_in_capturing();
    } else if (consent === 'false') {
      posthog.opt_out_capturing();
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}
