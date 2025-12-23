import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
import { useFeatureFlagEnabled } from 'posthog-js/react'

// Mock the hooks
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-active-state-manager')
jest.mock('posthog-js/react')

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>
const mockUseSidebarActiveState = useSidebarActiveState as jest.MockedFunction<typeof useSidebarActiveState>
const mockUseFeatureFlagEnabled = useFeatureFlagEnabled as jest.MockedFunction<typeof useFeatureFlagEnabled>

describe('MobileBottomNavigation Feature Flags', () => {
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

  describe('Documents feature flag', () => {
    it('should show Documents item in dropdown when feature flag is enabled', () => {
      // Mock feature flag as enabled
      mockUseFeatureFlagEnabled.mockReturnValue(true)
      
      render(<MobileBottomNavigation />)
      
      // Open the More dropdown
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      
      // Verify Documents item is visible
      expect(screen.getByText('Dokumente')).toBeInTheDocument()
      
      // Verify the feature flag was called with correct parameter
      expect(mockUseFeatureFlagEnabled).toHaveBeenCalledWith('documents_tab_access')
    })

    it('should hide Documents item in dropdown when feature flag is disabled', () => {
      // Mock feature flag as disabled
      mockUseFeatureFlagEnabled.mockReturnValue(false)
      
      render(<MobileBottomNavigation />)
      
      // Open the More dropdown
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      
      // Verify Documents item is not visible
      expect(screen.queryByText('Dokumente')).not.toBeInTheDocument()
      
      // Verify other items are still visible
      expect(screen.getByText('Häuser')).toBeInTheDocument()
      expect(screen.getByText('Wohnungen')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
      expect(screen.getByText('Aufgaben')).toBeInTheDocument()
    })

    it('should not affect other dropdown items when Documents is hidden', () => {
      // Mock feature flag as disabled
      mockUseFeatureFlagEnabled.mockReturnValue(false)
      
      render(<MobileBottomNavigation />)
      
      // Open the More dropdown
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      
      // Verify all other items are present and clickable
      const expectedItems = [
        { text: 'Häuser', href: '/haeuser' },
        { text: 'Wohnungen', href: '/wohnungen' },
        { text: 'Betriebskosten', href: '/betriebskosten' },
        { text: 'Aufgaben', href: '/todos' }
      ]
      
      expectedItems.forEach(item => {
        const element = screen.getByText(item.text)
        expect(element).toBeInTheDocument()
        expect(element.closest('a')).toHaveAttribute('href', item.href)
      })
    })

    it('should properly filter hidden items from dropdown rendering', () => {
      // Mock feature flag as disabled
      mockUseFeatureFlagEnabled.mockReturnValue(false)
      
      render(<MobileBottomNavigation />)
      
      // Open the More dropdown
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      
      // Count visible dropdown items (should be 4 without Documents)
      const dropdownItems = screen.getAllByRole('menuitem')
      expect(dropdownItems).toHaveLength(4)
      
      // Verify Documents is not in the list
      const itemTexts = dropdownItems.map(item => item.textContent)
      expect(itemTexts).not.toContain('Dokumente')
      expect(itemTexts).toEqual(['Häuser', 'Wohnungen', 'Betriebskosten', 'Aufgaben'])
    })

    it('should include Documents in dropdown when feature flag is enabled', () => {
      // Mock feature flag as enabled
      mockUseFeatureFlagEnabled.mockReturnValue(true)
      
      render(<MobileBottomNavigation />)
      
      // Open the More dropdown
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      
      // Count visible dropdown items (should be 5 with Documents)
      const dropdownItems = screen.getAllByRole('menuitem')
      expect(dropdownItems).toHaveLength(5)
      
      // Verify Documents is in the list
      const itemTexts = dropdownItems.map(item => item.textContent)
      expect(itemTexts).toContain('Dokumente')
      expect(itemTexts).toEqual(['Häuser', 'Wohnungen', 'Betriebskosten', 'Aufgaben', 'Dokumente'])
    })
  })

  describe('Feature flag integration', () => {
    it('should call useFeatureFlagEnabled with correct flag name', () => {
      mockUseFeatureFlagEnabled.mockReturnValue(true)
      
      render(<MobileBottomNavigation />)
      
      expect(mockUseFeatureFlagEnabled).toHaveBeenCalledWith('documents_tab_access')
      expect(mockUseFeatureFlagEnabled).toHaveBeenCalledTimes(1)
    })

    it('should handle feature flag changes dynamically', () => {
      // Start with feature flag disabled
      mockUseFeatureFlagEnabled.mockReturnValue(false)
      
      const { rerender } = render(<MobileBottomNavigation />)
      
      // Open dropdown and verify Documents is hidden
      const moreButton = screen.getByLabelText('Mehr')
      fireEvent.click(moreButton)
      expect(screen.queryByText('Dokumente')).not.toBeInTheDocument()
      
      // Close dropdown
      fireEvent.click(moreButton)
      
      // Change feature flag to enabled
      mockUseFeatureFlagEnabled.mockReturnValue(true)
      rerender(<MobileBottomNavigation />)
      
      // Open dropdown again and verify Documents is now visible
      fireEvent.click(moreButton)
      expect(screen.getByText('Dokumente')).toBeInTheDocument()
    })
  })
})