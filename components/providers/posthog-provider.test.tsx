import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import posthog from 'posthog-js'
import { PostHogProvider } from '@/components/providers/posthog-provider'

const mockGetUser = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => '/preise',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

jest.mock('@/lib/posthog-support', () => ({
  syncSupportIdentity: jest.fn().mockResolvedValue(null),
}))

jest.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    __loaded: false,
    init: jest.fn(),
    set_config: jest.fn(),
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    has_opted_in_capturing: jest.fn(),
    has_opted_out_capturing: jest.fn(),
    is_capturing: jest.fn(),
    reloadFeatureFlags: jest.fn(),
    get_distinct_id: jest.fn(),
    identify: jest.fn(),
    capture: jest.fn(),
  },
}))

const mockPosthog = posthog as jest.Mocked<typeof posthog> & { __loaded: boolean }

describe('PostHogProvider', () => {
  const originalEnv = process.env.NEXT_PUBLIC_POSTHOG_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key_123456'

    mockPosthog.__loaded = false
    mockPosthog.init.mockImplementation(() => {
      mockPosthog.__loaded = true
      return mockPosthog
    })
    mockPosthog.has_opted_in_capturing.mockReturnValue(false)
    mockPosthog.has_opted_out_capturing.mockReturnValue(true)
    // Simulate posthog-js returning true for is_capturing() before init and in cookieless mode
    mockPosthog.is_capturing.mockReturnValue(true)
    mockPosthog.get_distinct_id.mockReturnValue('anon-id')
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = originalEnv
  })

  it('initializes PostHog with cookieless_mode on_reject, person_profiles identified_only, and respect_dnt true', async () => {
    render(
      <PostHogProvider nonce="nonce-123">
        <div>child</div>
      </PostHogProvider>
    )

    await waitFor(() => {
      expect(mockPosthog.init).toHaveBeenCalledWith(
        'phc_test_key_123456',
        expect.objectContaining({
          opt_out_capturing_by_default: true,
          cookieless_mode: 'on_reject',
          person_profiles: 'identified_only',
          respect_dnt: true,
          nonce: 'nonce-123',
        })
      )
    })
  })

  it('captures anonymous cookieless $pageview and $pageleave without calling auth lookup when not opted in', async () => {
    const { unmount } = render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>
    )

    await waitFor(() => {
      expect(mockPosthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: `${window.location.origin}/preise`,
        user_type: 'anonymous',
        is_anonymous: true,
      })
    })

    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockPosthog.identify).not.toHaveBeenCalled()
    expect(mockPosthog.set_config).toHaveBeenCalledWith({ tracing_headers: [] })

    unmount()

    expect(mockPosthog.capture).toHaveBeenCalledWith('$pageleave', {
      $current_url: `${window.location.origin}/preise`,
      user_type: 'anonymous',
      is_anonymous: true,
    })
  })

  it('identifies authenticated user and enables tracing headers when opted in', async () => {
    localStorage.setItem('cookieConsent', 'all')
    mockPosthog.has_opted_in_capturing.mockReturnValue(true)
    mockPosthog.has_opted_out_capturing.mockReturnValue(false)
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
    })

    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>
    )

    await waitFor(() => {
      expect(mockPosthog.identify).toHaveBeenCalledWith('user-1', {
        email: 'test@example.com',
        user_type: 'authenticated',
        is_anonymous: false,
      })
    })

    await waitFor(() => {
      expect(mockPosthog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: `${window.location.origin}/preise`,
        user_type: 'authenticated',
        is_anonymous: false,
      })
    })

    expect(mockPosthog.set_config).toHaveBeenCalledWith({
      tracing_headers: [window.location.hostname],
    })
  })

  it('keeps tracing_headers disabled on consent-granted event when DNT keeps user opted out', async () => {
    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>
    )

    await waitFor(() => {
      expect(mockPosthog.init).toHaveBeenCalled()
    })

    mockPosthog.set_config.mockClear()
    // DNT active: has_opted_in_capturing() remains false even after consent event
    mockPosthog.has_opted_in_capturing.mockReturnValue(false)

    act(() => {
      window.dispatchEvent(new CustomEvent('posthog-consent-granted'))
    })

    expect(mockPosthog.set_config).toHaveBeenCalledWith({ tracing_headers: [] })
  })
})
