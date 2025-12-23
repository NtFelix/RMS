import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
      isRouteActive: jest.fn(() => false)
    })
  })

  it('should integrate search functionality with command menu', () => {
    render(<MobileBottomNavigation />)
    
    // Find the search button
    const searchButton = screen.getByLabelText('Suchen')
    expect(searchButton).toBeInTheDocument()
    
    // Click the search button
    fireEvent.click(searchButton)
    
    // Verify that setOpen was called with true to open the command menu
    expect(mockSetOpen).toHaveBeenCalledWith(true)
    expect(mockSetOpen).toHaveBeenCalledTimes(1)
  })

  it('should use the useCommandMenu hook', () => {
    render(<MobileBottomNavigation />)
    
    // Verify that the useCommandMenu hook was called
    expect(mockUseCommandMenu).toHaveBeenCalled()
  })

  it('should have search button with correct icon and label', () => {
    render(<MobileBottomNavigation />)
    
    const searchButton = screen.getByLabelText('Suchen')
    expect(searchButton).toBeInTheDocument()
    
    // Check that the button contains the search text
    expect(searchButton).toHaveTextContent('Suchen')
  })
})