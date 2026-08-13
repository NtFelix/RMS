import { GET } from './route'
import { createClient } from '@/utils/supabase/server'

jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: string | URL) => ({
      status: 307,
      headers: {
        get: (name: string) => name.toLowerCase() === 'location' ? url.toString() : null,
      },
    }),
  },
}))

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/logging-middleware', () => ({
  logApiRoute: jest.fn(),
}))

jest.mock('@/lib/posthog-helpers', () => ({
  capturePostHogEvent: jest.fn(),
}))

describe('/auth/callback route', () => {
  const mockExchangeCodeForSession = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          created_at: '2026-01-01T00:00:00.000Z',
          last_sign_in_at: '2026-01-02T00:00:00.000Z',
          app_metadata: { provider: 'google' },
        },
      },
      error: null,
    })
  })

  it('redirects social auth users back to a safe requested path', async () => {
    const request = new Request(
      'https://mietevo.de/auth/callback?code=abc&origin=https%3A%2F%2Fmietevo.de&redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dauth_1234567890'
    )

    const response = await GET(request)
    const location = response.headers.get('location')

    expect(location).toBe(
      'https://mietevo.de/oauth/consent?authorization_id=auth_1234567890&login_success=true&provider=google&is_new_user=false'
    )
  })

  it('falls back to dashboard for unsafe requested redirects', async () => {
    const request = new Request(
      'https://mietevo.de/auth/callback?code=abc&origin=https%3A%2F%2Fmietevo.de&redirect=https%3A%2F%2Fevil.example%2Foauth%2Fconsent'
    )

    const response = await GET(request)
    const location = response.headers.get('location')

    expect(location).toBe(
      'https://mietevo.de/dashboard?login_success=true&provider=google&is_new_user=false'
    )
  })
})
