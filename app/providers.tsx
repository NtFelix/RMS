'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import React from 'react'

const COOKIE_CONSENT_KEY = "cookie_consent"

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (storedConsent) {
        const consent = JSON.parse(storedConsent)
        if (consent.analytics) {
          posthog.init('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
            api_host: 'https://eu.i.posthog.com',
            persistence: 'localStorage+cookie',
          })
        } else {
          posthog.init('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
            api_host: 'https://eu.i.posthog.com',
            persistence: 'memory',
            disable_session_recording: true,
          })
        }
      }
    } catch (error) {
      console.error("Could not initialize PostHog", error)
    }
  }, [])

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
