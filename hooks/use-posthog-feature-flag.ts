'use client'

import { useEffect, useState } from 'react'

type PostHogWindowClient = {
  isFeatureEnabled?: (flag: string) => boolean | undefined
  onFeatureFlags?: (callback: () => void) => (() => void) | void
}

function getWindowPostHog() {
  if (typeof window === 'undefined') {
    return null
  }

  return (window as Window & { posthog?: PostHogWindowClient }).posthog ?? null
}

export function usePostHogFeatureFlag(flag: string) {
  const [isEnabled, setIsEnabled] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const posthog = getWindowPostHog()
    if (!posthog) {
      return
    }

    setIsEnabled(posthog.isFeatureEnabled?.(flag))

    const unsubscribe = posthog.onFeatureFlags?.(() => {
      setIsEnabled(posthog.isFeatureEnabled?.(flag))
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [flag])

  return isEnabled
}
