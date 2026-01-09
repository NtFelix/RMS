import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
import { useFeatureFlagEnabled } from 'posthog-js/react'

// Mock hooks
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-active-state-manager')
jest.mock('posthog-js/react')

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>
const mockUseSidebarActiveState = useSidebarActiveState as jest.MockedFunction<typeof useSidebarActiveState>
const mockUseFeatureFlagEnabled = useFeatureFlagEnabled as jest.MockedFunction<typeof useFeatureFlagEnabled>

describe('MobileBottomNavigation - Dropdown Simple Test', () => {
  const mockSetOpen = jest.fn()
  const mockIsRouteActive = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset window size to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    // Mock command menu hook
    mockUseCommandMenu.mockReturnValue({
      open: false,
      setOpen: mockSetOpen,
    })
    
    // Mock sidebar active state hook
    mockUseSidebarActiveState.mockReturnValue({
      isRouteActive: mockIsRouteActive,
      getActiveStateClasses: jest.fn(() => 'text-muted-foreground'),
      currentRoute: '/home',
      isCloudStorageActive: false,
    })
    
    // Mock feature flag hook
    mockUseFeatureFlagEnabled.mockReturnValue(true)
    
    // Mock route active state - default to home active
    mockIsRouteActive.mockImplementation((route: string) => route === '/home')
  })

  it('should toggle dropdown state correctly', async () => {
    const user = userEvent.setup()
    render(<MobileBottomNavigation />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
    })
    
    const moreButton = screen.getByLabelText(/Mehr menu/)
    
    // Initially dropdown should not be visible
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(moreButton).toHaveAttribute('aria-expanded', 'false')
    
    // Click to open dropdown
    await user.click(moreButton)
    
    // Dropdown should now be visible
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
    expect(moreButton).toHaveAttribute('aria-expanded', 'true')
    
    // Click again to close dropdown - wait for debounced action
    await user.click(moreButton)
    
    // Wait for dropdown to close with longer timeout for debouncing
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    }, { timeout: 2000 })
    
    expect(moreButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('should close dropdown when clicking dropdown item', async () => {
    const user = userEvent.setup()
    render(<MobileBottomNavigation />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
    })
    
    const moreButton = screen.getByLabelText(/Mehr menu/)
    
    // Open dropdown
    await user.click(moreButton)
    
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })
    
    // Click on a dropdown item
    const hauserLink = screen.getByLabelText(/Navigate to Häuser/)
    await user.click(hauserLink)
    
    // Dropdown should close with longer timeout for debouncing
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })
})