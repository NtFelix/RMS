import { render, screen, waitFor } from '@testing-library/react'
import { UserSettings } from '@/components/common/user-settings'
import { useApartmentUsage } from '@/hooks/use-apartment-usage'
import { User } from '@supabase/supabase-js'
import { SidebarUserData } from '@/lib/server/user-data'

// Mock dependencies
jest.mock('@/hooks/use-apartment-usage')
jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: jest.fn(() => ({
    user: null,
    userName: 'Test User',
    userEmail: 'test@example.com',
    userInitials: 'TU',
    isLoading: false,
    error: null,
  })),
}))
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

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  })),
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

  const mockSidebarData: SidebarUserData = {
    user: mockUser,
    userName: 'Test User',
    userEmail: 'test@example.com',
    userInitials: 'TU',
    apartmentCount: 0,
    apartmentLimit: null,
  }

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

    render(<UserSettings initialData={{ ...mockSidebarData, apartmentCount: 3, apartmentLimit: 5 }} />)

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

    render(<UserSettings initialData={{ ...mockSidebarData, apartmentCount: 10, apartmentLimit: null }} />)

    // Check if unlimited message is displayed
    await waitFor(() => {
      expect(screen.getByText('Unbegrenzte Wohnungen')).toBeInTheDocument()
    })

    // Verify no progress bar is shown for unlimited plans
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
