'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

type PostHogClient = {
  __loaded?: boolean
  config?: {
    nonce?: string
  }
  has_opted_in_capturing?: () => boolean
  has_opted_out_capturing?: () => boolean
  opt_in_capturing?: () => void
  opt_out_capturing?: () => void
  reloadFeatureFlags?: () => void
  capture: (event: string, properties?: Record<string, unknown>) => void
  identify: (distinctId: string, properties?: Record<string, unknown>) => void
  get_distinct_id?: () => string | undefined
  init: (key: string, options?: Record<string, unknown>) => void
}

interface PostHogConfig {
  key: string
  host: string
}

function getStoredConsent() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem('cookieConsent')
}

async function loadPostHogClient() {
  const module = await import('posthog-js')
  return module.default as unknown as PostHogClient
}

async function loadPostHogConfig(): Promise<PostHogConfig | null> {
  let config: {
    key?: string
    host?: string
  } = {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
  }

  if (!config.key || config.key === 'phc_placeholder_key') {
    const response = await fetch('/api/posthog-config')
    if (!response.ok) {
      return null
    }

    config = await response.json()
  }

  if (!config.key || config.key === 'phc_placeholder_key') {
    return null
  }

  return {
    key: config.key,
    host: config.host || 'https://eu.i.posthog.com',
  }
}

async function bootstrapPostHog(nonce?: string) {
  if (typeof window === 'undefined') {
    return null
  }

  if (getStoredConsent() !== 'all') {
    return null
  }

  const posthog = await loadPostHogClient()
  const config = await loadPostHogConfig()

  if (!config) {
    return null
  }

  if (!posthog.__loaded) {
    posthog.init(config.key, {
      api_host: config.host,
      capture_pageview: false,
      persistence: 'localStorage',
      enable_recording_console_log: false,
      opt_out_capturing_by_default: true,
      nonce,
      bootstrap: {
        distinctID: undefined,
      },
      loaded: (client: PostHogClient) => {
        client.reloadFeatureFlags?.()
      },
    } as Record<string, unknown>)
  } else if (nonce && posthog.config) {
    posthog.config.nonce = nonce
  }

  if (posthog.has_opted_out_capturing?.()) {
    posthog.opt_in_capturing?.()
    posthog.reloadFeatureFlags?.()
  }

  return posthog
}

export function PostHogProvider({
  children,
  nonce,
}: {
  children: React.ReactNode
  nonce?: string
}) {
  const pathname = usePathname()
  const [consentVersion, setConsentVersion] = useState(0)
  const [currentSearch, setCurrentSearch] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const updateSearch = () => {
      setCurrentSearch(window.location.search)
    }

    const notifyLocationChange = () => {
      window.dispatchEvent(new Event('posthog-location-change'))
    }

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args)
      notifyLocationChange()
    }

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      notifyLocationChange()
    }

    updateSearch()
    window.addEventListener('popstate', updateSearch)
    window.addEventListener('posthog-location-change', updateSearch)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', updateSearch)
      window.removeEventListener('posthog-location-change', updateSearch)
    }
  }, [])

  useEffect(() => {
    if (getStoredConsent() === 'all') {
      void bootstrapPostHog(nonce)
    }
  }, [nonce])

  useEffect(() => {
    const handleConsentGranted = () => {
      setConsentVersion((version) => version + 1)
      void bootstrapPostHog(nonce)
    }

    window.addEventListener('posthog-consent-granted', handleConsentGranted)
    return () => {
      window.removeEventListener('posthog-consent-granted', handleConsentGranted)
    }
  }, [nonce])

  useEffect(() => {
    const handleUserIdentification = async () => {
      if (getStoredConsent() !== 'all') {
        return
      }

      const posthog = await bootstrapPostHog(nonce)
      if (!posthog?.has_opted_in_capturing?.()) {
        return
      }

      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const currentDistinctId = posthog.get_distinct_id?.()
        if (user && currentDistinctId !== user.id) {
          posthog.identify(user.id, {
            email: user.email,
            user_type: 'authenticated',
            is_anonymous: false,
          })
        }
      } catch (error) {
        console.error('Error handling PostHog identification:', error)
      }
    }

    void handleUserIdentification()
  }, [pathname, consentVersion, nonce])

  useEffect(() => {
    const trackPageview = async () => {
      if (!pathname || getStoredConsent() !== 'all') {
        return
      }

      const posthog = await bootstrapPostHog(nonce)
      if (!posthog?.has_opted_in_capturing?.()) {
        return
      }

      let isAuthenticated = false

      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        isAuthenticated = !!user
      } catch {
        isAuthenticated = false
      }

      const url = currentSearch
        ? `${window.location.origin}${pathname}${currentSearch}`
        : `${window.location.origin}${pathname}`

      posthog.capture('$pageview', {
        $current_url: url,
        user_type: isAuthenticated ? 'authenticated' : 'anonymous',
        is_anonymous: !isAuthenticated,
        page_type: pathname.startsWith('/dokumentation') ? 'documentation' : 'other',
      })
    }

    void trackPageview()
  }, [pathname, currentSearch, consentVersion, nonce])

  useEffect(() => {
    const params = new URLSearchParams(currentSearch)
    const loginSuccess = params.get('login_success')
    const provider = params.get('provider')

    if (loginSuccess !== 'true' || getStoredConsent() !== 'all') {
      return
    }

    const trackLogin = async () => {
      const posthog = await bootstrapPostHog(nonce)
      if (!posthog?.has_opted_in_capturing?.()) {
        return
      }

      const { createClient } = await import('@/utils/supabase/client')
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

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

      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('login_success')
      newUrl.searchParams.delete('provider')
      window.history.replaceState({}, '', newUrl.toString())
    }

    void trackLogin()
  }, [currentSearch, consentVersion, nonce])

  return <>{children}</>
}
