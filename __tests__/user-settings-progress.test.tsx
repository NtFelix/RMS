import { render, screen, waitFor } from '@testing-library/react'
import { UserSettings } from '@/components/user-settings'
import { createClient } from '@/utils/supabase/client'

// Mock dependencies
jest.mock('@/utils/supabase/client')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openTemplatesModal: jest.fn(),
  }),
}))
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
}))

describe('UserSettings with Progress Bar', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('displays progress bar with apartment count and limit', async () => {
    // Mock user data
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User',
          },
        },
      },
      error: null,
    })

    // Mock apartment count
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 3,
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stripe_subscription_status: 'trialing',
                  stripe_price_id: null,
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    render(<UserSettings />)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    // Check if progress bar text is displayed
    await waitFor(() => {
      expect(screen.getByText(/3 \/ 5 Wohnungen/)).toBeInTheDocument()
    })
  })

  it('displays unlimited message when no limit', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {
            first_name: 'Test',
            last_name: 'User',
          },
        },
      },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              count: 10,
              error: null,
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  stripe_subscription_status: 'active',
                  stripe_price_id: 'price_unlimited',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    // Mock fetch for plans API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          priceId: 'price_unlimited',
          limit_wohnungen: null,
        },
      ],
    })

    render(<UserSettings />)

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Unbegrenzte Wohnungen')).toBeInTheDocument()
    })
  })
})
