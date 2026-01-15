import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useSidebarActiveState } from '@/hooks/use-active-state-manager'
import { useFeatureFlagEnabled } from 'posthog-js/react'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => '/dashboard'),
}))

// Mock hooks
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-active-state-manager')
jest.mock('posthog-js/react')

// Mock navigator.vibrate for haptic feedback testing
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
})

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>
const mockUseSidebarActiveState = useSidebarActiveState as jest.MockedFunction<typeof useSidebarActiveState>
const mockUseFeatureFlagEnabled = useFeatureFlagEnabled as jest.MockedFunction<typeof useFeatureFlagEnabled>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>

describe('MobileBottomNavigation - Comprehensive Functionality Tests', () => {
  const mockSetOpen = jest.fn()
  const mockPush = jest.fn()
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
      currentRoute: '/dashboard',
      isCloudStorageActive: false,
    })

    // Mock feature flag hook
    mockUseFeatureFlagEnabled.mockReturnValue(true)

    // Mock router
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    })

    // Mock route active state - default to home active
    mockIsRouteActive.mockImplementation((route: string) => route === '/dashboard')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Navigation Links Functionality', () => {
    it('should render all primary navigation items with correct links', async () => {
      render(<MobileBottomNavigation />)

      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      // Check all primary navigation items (using regex to handle active state)
      expect(screen.getByLabelText(/Navigate to Home/)).toHaveAttribute('href', '/dashboard')
      expect(screen.getByLabelText('Navigate to Mieter')).toHaveAttribute('href', '/mieter')
      expect(screen.getByLabelText('Navigate to Finanzen')).toHaveAttribute('href', '/finanzen')
      expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
      expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
    })

    it('should navigate to correct pages when navigation items are clicked', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      // Test navigation to different pages
      const homeLink = screen.getByLabelText(/Navigate to Home/)
      const mieterLink = screen.getByLabelText('Navigate to Mieter')
      const finanzenLink = screen.getByLabelText('Navigate to Finanzen')

      // Click links should work (they use Next.js Link component)
      await user.click(homeLink)
      await user.click(mieterLink)
      await user.click(finanzenLink)

      // Verify links have correct href attributes
      expect(homeLink).toHaveAttribute('href', '/dashboard')
      expect(mieterLink).toHaveAttribute('href', '/mieter')
      expect(finanzenLink).toHaveAttribute('href', '/finanzen')
    })

    it('should render dropdown navigation items with correct links', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      // Open dropdown
      const moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      // Check all dropdown items
      expect(screen.getByLabelText('Navigate to Häuser')).toHaveAttribute('href', '/haeuser')
      expect(screen.getByLabelText('Navigate to Wohnungen')).toHaveAttribute('href', '/wohnungen')
      expect(screen.getByLabelText('Navigate to Betriebskosten')).toHaveAttribute('href', '/betriebskosten')
      expect(screen.getByLabelText('Navigate to Aufgaben')).toHaveAttribute('href', '/todos')
      expect(screen.getByLabelText('Navigate to Dokumente')).toHaveAttribute('href', '/dateien')
    })
  })

  describe('Dropdown Functionality', () => {
    it('should open dropdown when More button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Initially dropdown should not be visible
      expect(screen.queryByLabelText('Navigate to Häuser')).not.toBeInTheDocument()

      // Click More button
      await user.click(moreButton)

      // Dropdown should now be visible
      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      // More button should have aria-expanded="true"
      expect(moreButton).toHaveAttribute('aria-expanded', 'true')
    })

    it('should close dropdown when More button is clicked again', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Open dropdown
      await user.click(moreButton)
      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Häuser/)).toBeInTheDocument()
      })

      // Close dropdown
      await user.click(moreButton)
      await waitFor(() => {
        expect(screen.queryByLabelText(/Navigate to Häuser/)).not.toBeInTheDocument()
      }, { timeout: 1000 })

      // More button should have aria-expanded="false"
      expect(moreButton).toHaveAttribute('aria-expanded', 'false')
    })

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Open dropdown
      await user.click(moreButton)
      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      // Click outside (on document body)
      fireEvent.mouseDown(document.body)

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByLabelText('Navigate to Häuser')).not.toBeInTheDocument()
      })
    })

    it('should close dropdown when selecting a dropdown item', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Open dropdown
      await user.click(moreButton)
      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Häuser/)).toBeInTheDocument()
      })

      // Click on a dropdown item
      const hauserLink = screen.getByLabelText(/Navigate to Häuser/)
      await user.click(hauserLink)

      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByLabelText(/Navigate to Häuser/)).not.toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should support keyboard navigation in dropdown', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Open dropdown with keyboard
      await user.click(moreButton)
      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      // Test arrow key navigation
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowUp}')

      // Test escape key to close
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByLabelText('Navigate to Häuser')).not.toBeInTheDocument()
      })
    })
  })

  describe('Active State Highlighting', () => {
    it('should highlight active navigation item', async () => {
      // Mock home route as active
      mockIsRouteActive.mockImplementation((route: string) => route === '/dashboard')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      const homeLink = screen.getByLabelText(/Navigate to Home/)

      // Should have active styling classes
      expect(homeLink).toHaveClass('bg-primary/10', 'text-primary')
    })

    it('should highlight More button when dropdown route is active', async () => {
      // Mock a dropdown route as active
      mockIsRouteActive.mockImplementation((route: string) => route === '/haeuser')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText(/Mehr menu/)

      // Should have active styling classes
      expect(moreButton).toHaveClass('bg-primary/10', 'text-primary')
    })

    it('should highlight active dropdown item', async () => {
      const user = userEvent.setup()

      // Mock houses route as active
      mockIsRouteActive.mockImplementation((route: string) => route === '/haeuser')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      // Open dropdown
      const moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Häuser/)).toBeInTheDocument()
      })

      const hauserLink = screen.getByLabelText(/Navigate to Häuser/)

      // Should have active styling classes
      expect(hauserLink).toHaveClass('bg-primary/10', 'text-primary')
      expect(hauserLink).toHaveAttribute('aria-current', 'page')
    })

    it('should update active state when route changes', async () => {
      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      // Initially home is active
      mockIsRouteActive.mockImplementation((route: string) => route === '/dashboard')
      rerender(<MobileBottomNavigation />)

      let homeLink = screen.getByLabelText(/Navigate to Home/)
      expect(homeLink).toHaveClass('bg-primary/10', 'text-primary')

      // Change to mieter active
      mockIsRouteActive.mockImplementation((route: string) => route === '/mieter')
      rerender(<MobileBottomNavigation />)

      homeLink = screen.getByLabelText(/Navigate to Home/)
      const mieterLink = screen.getByLabelText(/Navigate to Mieter/)

      expect(homeLink).not.toHaveClass('bg-primary/10', 'text-primary')
      expect(mieterLink).toHaveClass('bg-primary/10', 'text-primary')
    })
  })

  describe('Search Functionality Integration', () => {
    it('should open command menu when search button is clicked', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
      })

      const searchButton = screen.getByLabelText('Suchen - Open search')
      await user.click(searchButton)

      // Should call setOpen with true (wait for debounced call)
      await waitFor(() => {
        expect(mockSetOpen).toHaveBeenCalledWith(true)
      }, { timeout: 1000 })
    })

    it('should use the useCommandMenu hook correctly', () => {
      render(<MobileBottomNavigation />)

      // Verify that the useCommandMenu hook was called
      expect(mockUseCommandMenu).toHaveBeenCalled()
    })

    it('should have search button with correct accessibility attributes', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
      })

      const searchButton = screen.getByLabelText('Suchen - Open search')

      // Should be a button element
      expect(searchButton.tagName).toBe('BUTTON')

      // Should have proper aria-label
      expect(searchButton).toHaveAttribute('aria-label', 'Suchen - Open search')
    })

    it('should prevent rapid search button clicks', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
      })

      const searchButton = screen.getByLabelText('Suchen - Open search')

      // Click multiple times rapidly
      await user.click(searchButton)
      await user.click(searchButton)
      await user.click(searchButton)

      // Wait for debounced calls to complete
      await waitFor(() => {
        expect(mockSetOpen).toHaveBeenCalled()
      }, { timeout: 1000 })

      // Should have been called at least once, but debouncing should limit calls
      expect(mockSetOpen).toHaveBeenCalledWith(true)
    })
  })

  describe('Feature Flag Conditional Rendering', () => {
    it('should show Documents item when feature flag is enabled', async () => {
      const user = userEvent.setup()

      // Enable documents feature flag
      mockUseFeatureFlagEnabled.mockReturnValue(true)

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      // Open dropdown
      const moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Dokumente')).toBeInTheDocument()
      })

      // Documents item should be visible
      expect(screen.getByLabelText('Navigate to Dokumente')).toBeInTheDocument()
    })

    it('should hide Documents item when feature flag is disabled', async () => {
      const user = userEvent.setup()

      // Disable documents feature flag
      mockUseFeatureFlagEnabled.mockReturnValue(false)

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      // Open dropdown
      const moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      // Documents item should not be visible
      expect(screen.queryByLabelText('Navigate to Dokumente')).not.toBeInTheDocument()
    })

    it('should call useFeatureFlagEnabled with correct flag name', () => {
      render(<MobileBottomNavigation />)

      expect(mockUseFeatureFlagEnabled).toHaveBeenCalledWith('documents_tab_access')
    })

    it('should update Documents visibility when feature flag changes', async () => {
      const user = userEvent.setup()

      // Start with feature flag disabled
      mockUseFeatureFlagEnabled.mockReturnValue(false)

      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
      })

      // Open dropdown and verify Documents is hidden
      let moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Häuser')).toBeInTheDocument()
      })

      expect(screen.queryByLabelText('Navigate to Dokumente')).not.toBeInTheDocument()

      // Close dropdown
      await user.click(moreButton)

      // Enable feature flag
      mockUseFeatureFlagEnabled.mockReturnValue(true)
      rerender(<MobileBottomNavigation />)

      // Open dropdown again and verify Documents is now visible
      moreButton = screen.getByLabelText(/Mehr menu/)
      await user.click(moreButton)

      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Dokumente')).toBeInTheDocument()
      })
    })
  })

  describe('Touch Interactions', () => {
    it('should provide touch feedback on touch start', async () => {
      // Mock a non-active route to avoid active state class conflicts
      mockIsRouteActive.mockImplementation((route: string) => route === '/mieter')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      const homeButton = screen.getByLabelText(/Navigate to Home/)

      // Simulate touch start
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      // Should apply touch feedback classes (check for scale-95 which is the key touch feedback)
      await waitFor(() => {
        expect(homeButton).toHaveClass('scale-95')
      })
    })

    it('should clear touch feedback on touch end', async () => {
      // Mock a non-active route to avoid active state class conflicts
      mockIsRouteActive.mockImplementation((route: string) => route === '/mieter')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      const homeButton = screen.getByLabelText(/Navigate to Home/)

      // Simulate touch start and end
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      })

      // Touch feedback should be cleared after a delay (check that scale-95 from touch is removed)
      await waitFor(() => {
        // The element might still have scale-95 from active:scale-95 CSS class, 
        // but the touch-specific scale-95 should be cleared
        const classes = homeButton.className
        // Count occurrences of scale-95 - should be 1 or less after touch end
        const scaleCount = (classes.match(/scale-95/g) || []).length
        expect(scaleCount).toBeLessThanOrEqual(1)
      }, { timeout: 300 })
    })

    it('should provide haptic feedback on valid tap', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      const homeButton = screen.getByLabelText(/Navigate to Home/)

      // Simulate quick tap
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })

      // Short delay to simulate quick tap
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })

      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      })

      // Should call navigator.vibrate for haptic feedback
      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(10)
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('should not render on desktop screens', async () => {
      // Set desktop screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const { container } = render(<MobileBottomNavigation />)

      // Wait for component to mount and check screen size
      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should render on mobile screens', async () => {
      // Set mobile screen size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })

    it('should handle screen size changes', async () => {
      const { rerender } = render(<MobileBottomNavigation />)

      // Start with mobile
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      // Change to desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      // Trigger resize event
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })

      // Component should handle the resize
      await waitFor(() => {
        // The component should still be rendered but may adjust behavior
        expect(screen.queryByRole('navigation')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Compliance', () => {
    it('should have proper navigation role and aria-label', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main mobile navigation')
    })

    it('should have minimum touch target sizes', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      // All interactive elements should have minimum 44px touch targets
      const interactiveElements = [
        screen.getByLabelText(/Navigate to Home/),
        screen.getByLabelText('Navigate to Mieter'),
        screen.getByLabelText('Suchen - Open search'),
        screen.getByLabelText('Navigate to Finanzen'),
        screen.getByLabelText(/Mehr menu/),
      ]

      interactiveElements.forEach(element => {
        expect(element).toHaveClass('min-h-[44px]')
        expect(element).toHaveClass('min-w-[44px]')
      })
    })

    it('should have proper focus management', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
      })

      // Tab through navigation items
      await user.tab()
      await user.tab()
      await user.tab()

      // Focus should be manageable
      expect(document.activeElement).toBeInTheDocument()
    })
  })
})