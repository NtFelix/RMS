import { render, screen, waitFor } from '@testing-library/react'
import { UserSettings } from '@/components/common/user-settings'
import { useApartmentUsage } from '@/hooks/use-apartment-usage'
import { User } from '@supabase/supabase-js'

// Mock dependencies
jest.mock('@/hooks/use-apartment-usage')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    openTemplatesModal: jest.fn(),
  })),
}))
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
}))

describe('UserSettings with Progress Bar', () => {
  const mockUseApartmentUsage = useApartmentUsage as jest.MockedFunction<typeof useApartmentUsage>
  
  // Mock user data
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      first_name: 'Test',
      last_name: 'User',
    },
  } as unknown as User

  const setupMocks = (apartmentCount: number, apartmentLimit: number | null) => {
    mockUseApartmentUsage.mockReturnValue({
      count: apartmentCount,
      limit: apartmentLimit,
      isLoading: false,
      error: null,
      progressPercentage: apartmentLimit ? Math.min((apartmentCount / apartmentLimit) * 100, 100) : 0,
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock for useApartmentUsage
    setupMocks(0, null)
  })

  it('displays progress bar with apartment count and limit', async () => {
    // Setup mock with limited plan (5 apartments)
    setupMocks(3, 5)

    render(<UserSettings />)

    // Check if progress bar text is displayed with the correct count and limit
    await waitFor(() => {
      expect(screen.getByText(/3 \/ 5 Wohnungen/)).toBeInTheDocument()
    })

    // Verify the progress bar is rendered
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
  })

  it('displays unlimited message when no limit', async () => {
    // Setup mock with unlimited plan (null limit)
    setupMocks(10, null)

    render(<UserSettings />)

    // Check if unlimited message is displayed
    await waitFor(() => {
      expect(screen.getByText('Unbegrenzte Wohnungen')).toBeInTheDocument()
    })

    // Verify no progress bar is shown for unlimited plans
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
