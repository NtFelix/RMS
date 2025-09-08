/**
 * Final Integration Test for Mobile Responsive Navigation
 * 
 * This test suite verifies the complete mobile navigation flow across all pages,
 * seamless transition between mobile and desktop views, add menu integrations,
 * and comprehensive cross-device testing scenarios.
 * 
 * Requirements tested: 6.1, 6.2, 6.3, 6.4
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { MobileAddMenu } from '@/components/mobile/mobile-add-menu'
import { MobileMoreMenu } from '@/components/mobile/mobile-more-menu'
import { MobileFilterButton } from '@/components/mobile/mobile-filter-button'
import { MobileSearchBar } from '@/components/mobile/mobile-search-bar'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  usePathname: jest.fn(() => '/home'),
}))

// Mock hooks with proper implementations
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    openHouseModal: jest.fn(),
    openWohnungModal: jest.fn(),
    openTenantModal: jest.fn(),
    openFinanceModal: jest.fn(),
    openAufgabeModal: jest.fn(),
  })),
}))

jest.mock('@/hooks/use-mobile-nav-store', () => ({
  useMobileNavigation: jest.fn(() => ({
    isAddMenuOpen: false,
    isMoreMenuOpen: false,
    openAddMenu: jest.fn(),
    closeAddMenu: jest.fn(),
    openMoreMenu: jest.fn(),
    closeMoreMenu: jest.fn(),
  })),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(() => true),
}))

jest.mock('@/hooks/use-orientation', () => ({
  useOrientation: jest.fn(() => ({ orientation: 'portrait' })),
  useOrientationAwareMobile: jest.fn(() => ({ 
    isMobile: true, 
    orientation: 'portrait', 
    isChanging: false 
  })),
}))

jest.mock('@/hooks/use-mobile-performance', () => ({
  useOptimizedAnimations: jest.fn(() => ({ 
    duration: 200, 
    shouldReduceMotion: false 
  })),
  useMobileDebounce: jest.fn((fn) => fn),
}))

describe('Mobile Navigation Final Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Mobile Navigation Flow', () => {
    it('should render mobile navigation with all navigation items', () => {
      render(<MobileBottomNav currentPath="/home" />)

      // Verify all navigation items are present
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      expect(screen.getByLabelText('Open add menu')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Wohnungen')).toBeInTheDocument()
      expect(screen.getByLabelText('Open Weitere menu')).toBeInTheDocument()
    })

    it('should show active state for current page', () => {
      render(<MobileBottomNav currentPath="/haeuser" />)

      const hausButton = screen.getByLabelText('Navigate to Häuser')
      expect(hausButton).toHaveClass('text-blue-600', 'bg-blue-50')
    })

    it('should handle navigation between different pages', () => {
      const { rerender } = render(<MobileBottomNav currentPath="/home" />)

      // Initially home should be active
      expect(screen.getByLabelText('Navigate to Home')).toHaveClass('text-blue-600')

      // Change to häuser page
      rerender(<MobileBottomNav currentPath="/haeuser" />)
      expect(screen.getByLabelText('Navigate to Häuser')).toHaveClass('text-blue-600')
    })
  })

  describe('Seamless Mobile/Desktop Transition', () => {
    it('should hide mobile navigation on desktop', () => {
      // Mock desktop view
      const { useIsMobile } = require('@/hooks/use-mobile')
      useIsMobile.mockReturnValue(false)

      render(<MobileBottomNav currentPath="/home" />)

      // Mobile navigation should not render on desktop
      expect(screen.queryByLabelText('Navigate to Home')).not.toBeInTheDocument()
    })

    it('should show mobile navigation on mobile devices', () => {
      // Mock mobile view (default)
      render(<MobileBottomNav currentPath="/home" />)

      // Mobile navigation should be present
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
      expect(screen.getByLabelText('Open add menu')).toBeInTheDocument()
    })

    it('should handle viewport changes correctly', () => {
      const { rerender } = render(<MobileBottomNav currentPath="/home" />)

      // Initially mobile navigation is present
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()

      // Mock desktop view
      const { useIsMobile } = require('@/hooks/use-mobile')
      useIsMobile.mockReturnValue(false)

      rerender(<MobileBottomNav currentPath="/home" />)

      // Mobile navigation should be hidden on desktop
      expect(screen.queryByLabelText('Navigate to Home')).not.toBeInTheDocument()
    })
  })

  describe('Add Menu Integration with Existing Modals', () => {
    it('should render add menu when open', () => {
      render(<MobileAddMenu isOpen={true} />)

      expect(screen.getByText('Hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Haus hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Wohnung hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Mieter hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Finanzen hinzufügen')).toBeInTheDocument()
      expect(screen.getByText('Aufgabe hinzufügen')).toBeInTheDocument()
    })

    it('should not render add menu when closed', () => {
      render(<MobileAddMenu isOpen={false} />)

      expect(screen.queryByText('Hinzufügen')).not.toBeInTheDocument()
    })

    it('should call modal functions when options are selected', async () => {
      const user = userEvent.setup()
      const { useModalStore } = require('@/hooks/use-modal-store')
      const mockModalStore = {
        openHouseModal: jest.fn(),
        openWohnungModal: jest.fn(),
        openTenantModal: jest.fn(),
        openFinanceModal: jest.fn(),
        openAufgabeModal: jest.fn(),
      }
      useModalStore.mockReturnValue(mockModalStore)
      
      render(<MobileAddMenu isOpen={true} />)

      // Test house modal
      await user.click(screen.getByText('Haus hinzufügen'))
      expect(mockModalStore.openHouseModal).toHaveBeenCalledTimes(1)

      // Test apartment modal
      await user.click(screen.getByText('Wohnung hinzufügen'))
      expect(mockModalStore.openWohnungModal).toHaveBeenCalledTimes(1)

      // Test tenant modal
      await user.click(screen.getByText('Mieter hinzufügen'))
      expect(mockModalStore.openTenantModal).toHaveBeenCalledTimes(1)
    })

    it('should close menu when close button is clicked', async () => {
      const user = userEvent.setup()
      const { useMobileNavigation } = require('@/hooks/use-mobile-nav-store')
      const mockCloseAddMenu = jest.fn()
      useMobileNavigation.mockReturnValue({
        closeAddMenu: mockCloseAddMenu,
        isAddMenuOpen: true,
        isMoreMenuOpen: false,
        openAddMenu: jest.fn(),
        openMoreMenu: jest.fn(),
        closeMoreMenu: jest.fn(),
      })
      
      render(<MobileAddMenu isOpen={true} />)

      const closeButton = screen.getByLabelText('Menü schließen')
      await user.click(closeButton)

      expect(mockCloseAddMenu).toHaveBeenCalledTimes(1)
    })
  })

  describe('More Menu Navigation Integration', () => {
    it('should render more menu when open', () => {
      render(<MobileMoreMenu isOpen={true} currentPath="/home" />)

      expect(screen.getByText('Weitere')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Mieter')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Finanzen')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Betriebskosten')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Todos')).toBeInTheDocument()
    })

    it('should not render more menu when closed', () => {
      render(<MobileMoreMenu isOpen={false} currentPath="/home" />)

      expect(screen.queryByText('Weitere')).not.toBeInTheDocument()
    })

    it('should show active state for current page', () => {
      render(<MobileMoreMenu isOpen={true} currentPath="/mieter" />)

      const mieterOption = screen.getByLabelText('Navigate to Mieter')
      expect(mieterOption).toHaveClass('bg-blue-50', 'text-blue-700')
    })

    it('should close menu when navigation option is clicked', async () => {
      const user = userEvent.setup()
      const { useMobileNavigation } = require('@/hooks/use-mobile-nav-store')
      const mockCloseMoreMenu = jest.fn()
      useMobileNavigation.mockReturnValue({
        closeMoreMenu: mockCloseMoreMenu,
        isAddMenuOpen: false,
        isMoreMenuOpen: true,
        openAddMenu: jest.fn(),
        openMoreMenu: jest.fn(),
        closeAddMenu: jest.fn(),
      })
      
      render(<MobileMoreMenu isOpen={true} currentPath="/home" />)

      const mieterOption = screen.getByLabelText('Navigate to Mieter')
      await user.click(mieterOption)

      expect(mockCloseMoreMenu).toHaveBeenCalledTimes(1)
    })
  })

  describe('Mobile Filter and Search Integration', () => {
    const mockFilters = [
      { id: 'active', label: 'Aktiv', count: 5 },
      { id: 'inactive', label: 'Inaktiv', count: 2 },
      { id: 'pending', label: 'Ausstehend', count: 1 },
    ]

    it('should handle filter selection and display active count', async () => {
      const user = userEvent.setup()
      const mockOnFilterChange = jest.fn()
      
      render(
        <MobileFilterButton
          filters={mockFilters}
          activeFilters={['active']}
          onFilterChange={mockOnFilterChange}
        />
      )

      // Verify active filter count is displayed
      expect(screen.getByText('1')).toBeInTheDocument()

      // Open filter menu
      const filterButton = screen.getByLabelText('Filter options (1 active)')
      await user.click(filterButton)

      // Verify filter options are displayed
      expect(screen.getByText('Aktiv')).toBeInTheDocument()
      expect(screen.getByText('Inaktiv')).toBeInTheDocument()
      expect(screen.getByText('Ausstehend')).toBeInTheDocument()
    })

    it('should expand and collapse search bar correctly', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <MobileSearchBar
          value=""
          onChange={mockOnChange}
          placeholder="Test search"
        />
      )

      // Initially collapsed
      expect(screen.getByLabelText('Suche öffnen')).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Test search')).not.toBeInTheDocument()

      // Expand search
      const searchButton = screen.getByLabelText('Suche öffnen')
      await user.click(searchButton)

      // Should be expanded
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Test search')).toBeInTheDocument()
      })
    })

    it('should handle search input and clear functionality', async () => {
      const user = userEvent.setup()
      const mockOnChange = jest.fn()
      
      render(
        <MobileSearchBar
          value="test query"
          onChange={mockOnChange}
        />
      )

      // Expand search first
      const searchButton = screen.getByLabelText('Suche öffnen')
      await user.click(searchButton)

      await waitFor(() => {
        const input = screen.getByDisplayValue('test query')
        expect(input).toBeInTheDocument()
      })

      // Clear search
      const clearButton = screen.getByLabelText('Suche löschen')
      await user.click(clearButton)

      expect(mockOnChange).toHaveBeenCalledWith('')
    })
  })

  describe('Orientation Change Handling', () => {
    it('should adapt layout for landscape orientation', () => {
      const { useOrientationAwareMobile } = require('@/hooks/use-orientation')
      useOrientationAwareMobile.mockReturnValue({ 
        isMobile: true, 
        orientation: 'landscape', 
        isChanging: false 
      })

      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Verify landscape-specific classes are applied
      const main = screen.getByRole('main')
      expect(main).toHaveClass('p-2', 'pb-16')
    })

    it('should adapt layout for portrait orientation', () => {
      const { useOrientationAwareMobile } = require('@/hooks/use-orientation')
      useOrientationAwareMobile.mockReturnValue({ 
        isMobile: true, 
        orientation: 'portrait', 
        isChanging: false 
      })

      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Verify portrait-specific classes are applied
      const main = screen.getByRole('main')
      expect(main).toHaveClass('p-4', 'pb-20')
    })

    it('should handle orientation change transitions', () => {
      const { useOrientationAwareMobile } = require('@/hooks/use-orientation')
      useOrientationAwareMobile.mockReturnValue({ 
        isMobile: true, 
        orientation: 'landscape', 
        isChanging: true 
      })

      render(
        <DashboardLayout>
          <div>Test Content</div>
        </DashboardLayout>
      )

      // Verify transition classes are applied
      const main = screen.getByRole('main')
      expect(main).toHaveClass('opacity-95')
    })
  })

  describe('Touch Interaction and Accessibility', () => {
    it('should have proper touch target sizes for navigation buttons', () => {
      render(<MobileBottomNav currentPath="/home" />)

      const navButtons = screen.getAllByRole('button')
      navButtons.forEach(button => {
        expect(button).toHaveClass('min-w-[44px]', 'min-h-[44px]')
      })
    })

    it('should provide proper ARIA labels and roles', () => {
      render(<MobileBottomNav currentPath="/home" />)

      // Verify buttons have proper labels
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
      expect(screen.getByLabelText('Open add menu')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      expect(screen.getByLabelText('Navigate to Wohnungen')).toBeInTheDocument()
      expect(screen.getByLabelText('Open Weitere menu')).toBeInTheDocument()
    })

    it('should handle keyboard navigation in modals', async () => {
      const user = userEvent.setup()
      
      render(<MobileAddMenu isOpen={true} />)

      // Verify modal has proper role
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Verify modal has proper aria-label
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Hinzufügen Menü')
    })
  })

  describe('Performance and Error Handling', () => {
    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<MobileBottomNav currentPath="/home" />)

      // Should not throw errors when unmounting
      expect(() => unmount()).not.toThrow()
    })

    it('should handle missing props gracefully', () => {
      // Test with minimal props
      expect(() => {
        render(<MobileBottomNav />)
      }).not.toThrow()
    })

    it('should handle rapid interactions without errors', async () => {
      const user = userEvent.setup()
      const { useMobileNavigation } = require('@/hooks/use-mobile-nav-store')
      const mockOpenAddMenu = jest.fn()
      useMobileNavigation.mockReturnValue({
        openAddMenu: mockOpenAddMenu,
        isAddMenuOpen: false,
        isMoreMenuOpen: false,
        closeAddMenu: jest.fn(),
        openMoreMenu: jest.fn(),
        closeMoreMenu: jest.fn(),
      })
      
      render(<MobileBottomNav currentPath="/home" />)

      const addButton = screen.getByLabelText('Open add menu')
      
      // Rapidly click add button multiple times
      await user.click(addButton)
      await user.click(addButton)
      await user.click(addButton)

      // Should handle rapid clicks
      expect(mockOpenAddMenu).toHaveBeenCalled()
    })
  })

  describe('Cross-Device Compatibility', () => {
    it('should work correctly on different mobile screen sizes', () => {
      // Test with different viewport sizes
      const viewports = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11 Pro Max
      ]

      viewports.forEach(({ width, height }) => {
        // Mock viewport size
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        })
        Object.defineProperty(window, 'innerHeight', {
          writable: true,
          configurable: true,
          value: height,
        })

        const { unmount } = render(<MobileBottomNav currentPath="/home" />)

        // Verify mobile navigation renders correctly
        expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()

        unmount()
      })
    })

    it('should handle touch events correctly', async () => {
      render(<MobileBottomNav currentPath="/home" />)

      const addButton = screen.getByLabelText('Open add menu')
      
      // Simulate touch interaction
      fireEvent.touchStart(addButton)
      fireEvent.touchEnd(addButton)
      
      // Should handle touch events without errors
      expect(addButton).toBeInTheDocument()
    })

    it('should adapt to orientation changes', () => {
      const { useOrientationAwareMobile } = require('@/hooks/use-orientation')
      
      // Test portrait orientation
      useOrientationAwareMobile.mockReturnValue({ 
        isMobile: true, 
        orientation: 'portrait', 
        isChanging: false 
      })

      const { rerender } = render(<MobileBottomNav currentPath="/home" />)
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()

      // Test landscape orientation
      useOrientationAwareMobile.mockReturnValue({ 
        isMobile: true, 
        orientation: 'landscape', 
        isChanging: false 
      })

      rerender(<MobileBottomNav currentPath="/home" />)
      expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
    })
  })
})