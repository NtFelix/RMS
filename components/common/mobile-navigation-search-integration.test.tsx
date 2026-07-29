import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'

// Mock the hooks
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-active-state-manager')
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(() => true)
}))

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>
const mockUseSidebarActiveState = useSidebarActiveState as jest.MockedFunction<typeof useSidebarActiveState>

describe('MobileBottomNavigation Search Integration', () => {
  const mockSetOpen = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseCommandMenu.mockReturnValue({
      open: false,
      setOpen: mockSetOpen
    })
    
    mockUseSidebarActiveState.mockReturnValue({
      isRouteActive: jest.fn(() => false),
      getActiveStateClasses: jest.fn(),
      currentRoute: '',
      isCloudStorageActive: false
    })
  })

  it('should integrate search functionality with command menu', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<MobileBottomNavigation />)
    
    // Find the search button
    const searchButton = screen.getByLabelText(/Suchen - Open search/)
    expect(searchButton).toBeInTheDocument()
    
    // Click the search button
    fireEvent.click(searchButton)
    
    // Verify that setOpen was called with true to open the command menu
    await waitFor(() => {
      expect(mockSetOpen).toHaveBeenCalledWith(true)
    })
  })

  it('should use the useCommandMenu hook', () => {
    render(<MobileBottomNavigation />)
    
    // Verify that the useCommandMenu hook was called
    expect(mockUseCommandMenu).toHaveBeenCalled()
  })

  it('should have search button with correct icon and label', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<MobileBottomNavigation />)
    
    const searchButton = screen.getByLabelText(/Suchen - Open search/)
    expect(searchButton).toBeInTheDocument()
    
    // Check that the button contains the search text
    expect(searchButton).toHaveTextContent('Suchen')
  })
})