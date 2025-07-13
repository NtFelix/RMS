'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

import React from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init('phc_jfMUSdIAQg9y9uJNtHpT4vf8kdv0ZvT6aHfq7R4Kyx3', {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2025-05-24',
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  )
}
