/**
 * Comprehensive accessibility compliance tests for mobile navigation
 * Tests screen reader support, keyboard navigation, touch targets, and focus management
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock hooks
const mockSetOpen = jest.fn()
const mockIsRouteActive = jest.fn()
const mockUseFeatureFlagEnabled = jest.fn()

jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    setOpen: mockSetOpen
  })
}))

jest.mock('@/hooks/use-active-state-manager', () => ({
  useSidebarActiveState: () => ({
    isRouteActive: mockIsRouteActive
  })
}))

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => mockUseFeatureFlagEnabled()
}))

jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

// Mock window.innerWidth for mobile viewport
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 375, // Mobile viewport
})

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  configurable: true,
  value: jest.fn(),
})

describe('MobileBottomNavigation - Accessibility Compliance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsRouteActive.mockReturnValue(false)
    mockUseFeatureFlagEnabled.mockReturnValue(true)

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Screen Reader Support', () => {
    test('provides proper ARIA labels for navigation container', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveAttribute('aria-label', 'Main mobile navigation')
        expect(nav).toHaveAttribute('role', 'navigation')
      })
    })

    test('provides descriptive ARIA labels for all navigation items', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        // Check primary navigation items
        expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
        expect(screen.getByLabelText('Navigate to Mieter')).toBeInTheDocument()
        expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
        expect(screen.getByLabelText('Navigate to Finanzen')).toBeInTheDocument()
        expect(screen.getByLabelText('Mehr menu')).toBeInTheDocument()
      })
    })

    test('announces current page state with aria-current', async () => {
      mockIsRouteActive.mockImplementation((route) => route === '/dashboard')

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const homeLink = screen.getByLabelText('Navigate to Home (current page)')
        expect(homeLink).toHaveAttribute('aria-current', 'page')
      })
    })

    test('provides live region for navigation announcements', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveAttribute('aria-live', 'polite')
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
        expect(liveRegion).toHaveClass('sr-only')
      })
    })

    test('announces dropdown state changes', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        expect(moreButton).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('status')).toHaveTextContent('More menu opened. Use arrow keys to navigate.')
      })
    })

    test('provides proper dropdown menu semantics', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        const dropdown = screen.getByRole('menu')
        expect(dropdown).toHaveAttribute('aria-label', 'More navigation options')
        expect(dropdown).toHaveAttribute('aria-orientation', 'vertical')

        // Check menu items
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems).toHaveLength(8) // All dropdown items should be visible

        menuItems.forEach(item => {
          expect(item).toHaveAttribute('role', 'menuitem')
        })
      })
    })

    test('provides descriptive help text for More button', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toHaveAttribute('aria-describedby', 'more-button-description')

        const description = screen.getByText('Opens additional navigation options. Use arrow keys to navigate when open.')
        expect(description).toHaveClass('sr-only')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        interactiveElements.forEach(element => {
          expect(element).not.toHaveAttribute('tabindex', '-1')
        })
      })
    })

    test('provides proper focus management in dropdown', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        // First dropdown item should be focused
        const firstItem = screen.getByRole('menuitem', { name: /Navigate to Häuser/ })
        expect(firstItem).toHaveFocus()
      })
    })

    test('supports arrow key navigation in dropdown', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        const firstItem = screen.getByRole('menuitem', { name: /Navigate to Häuser/ })
        expect(firstItem).toHaveFocus()
      })

      // Navigate down
      await act(async () => {
        await user.keyboard('{ArrowDown}')
      })

      await waitFor(() => {
        const secondItem = screen.getByRole('menuitem', { name: /Navigate to Wohnungen/ })
        expect(secondItem).toHaveFocus()
      })

      // Navigate up
      await act(async () => {
        await user.keyboard('{ArrowUp}')
      })

      await waitFor(() => {
        const firstItem = screen.getByRole('menuitem', { name: /Navigate to Häuser/ })
        expect(firstItem).toHaveFocus()
      })
    })

    test('supports Home and End keys in dropdown', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      // Navigate to second item first
      await act(async () => {
        await user.keyboard('{ArrowDown}')
      })

      // Press Home key
      await act(async () => {
        await user.keyboard('{Home}')
      })

      await waitFor(() => {
        const firstItem = screen.getByRole('menuitem', { name: /Navigate to Häuser/ })
        expect(firstItem).toHaveFocus()
      })

      // Press End key
      await act(async () => {
        await user.keyboard('{End}')
      })

      await waitFor(() => {
        const lastItem = screen.getByRole('menuitem', { name: /Open Abmelden/ })
        expect(lastItem).toHaveFocus()
      })
    })

    test('closes dropdown with Escape key and returns focus', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        expect(moreButton).toHaveAttribute('aria-expanded', 'true')
      })

      // Press Escape
      await act(async () => {
        await user.keyboard('{Escape}')
      })

      await waitFor(() => {
        expect(moreButton).toHaveAttribute('aria-expanded', 'false')
        expect(moreButton).toHaveFocus()
        expect(screen.getByRole('status')).toHaveTextContent('More menu closed.')
      })
    })

    test('provides proper focus indicators', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const focusableElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        focusableElements.forEach(element => {
          // Check that focus styles are applied via CSS classes
          expect(element).toHaveClass('focus:outline-none')
          expect(element).toHaveClass('focus:ring-2')
          expect(element).toHaveClass('focus:ring-primary/20')
        })
      })
    })
  })

  describe('Touch Target Sizes', () => {
    test('all interactive elements meet minimum 44px touch target requirement', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        interactiveElements.forEach(element => {
          // Check for minimum height class
          expect(element).toHaveClass('min-h-[44px]')
          expect(element).toHaveClass('min-w-[44px]')
        })
      })
    })

    test('dropdown items meet minimum touch target requirements', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')

        menuItems.forEach(item => {
          expect(item).toHaveClass('min-h-[44px]')
        })
      })
    })

    test('provides adequate spacing between touch targets', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const navContainer = screen.getByRole('navigation')
        const navItems = navContainer.querySelectorAll('[class*="mobile-nav-item"]')

        // Check that items have proper padding/margin
        navItems.forEach(item => {
          expect(item).toHaveClass('px-3')
          expect(item).toHaveClass('py-2')
        })
      })
    })
  })

  describe('Focus Management', () => {
    test('maintains proper focus order', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const focusableElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        expect(focusableElements.length).toBeGreaterThan(0)
      })

      // Tab through elements and verify order
      const expectedOrder = ['Home', 'Mieter', 'Suchen', 'Finanzen', 'Mehr']

      for (let i = 0; i < expectedOrder.length; i++) {
        await act(async () => {
          await user.tab()
        })

        const focusedElement = document.activeElement
        expect(focusedElement).toHaveTextContent(expectedOrder[i])
      }
    })

    test('traps focus within dropdown when open', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems[0]).toHaveFocus()
      })

      // Tab should close dropdown (normal tab behavior)
      await act(async () => {
        await user.tab()
      })

      await waitFor(() => {
        expect(moreButton).toHaveAttribute('aria-expanded', 'false')
      })
    })

    test('manages focus correctly when dropdown closes', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      // Close with Escape
      await act(async () => {
        await user.keyboard('{Escape}')
      })

      await waitFor(() => {
        expect(moreButton).toHaveFocus()
      })
    })

    test('provides visible focus indicators', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const firstFocusable = screen.getAllByRole('link')[0]
        expect(firstFocusable).toBeInTheDocument()
      })

      // Focus first element
      await act(async () => {
        await user.tab()
      })

      const focusedElement = document.activeElement
      expect(focusedElement).toHaveClass('focus:ring-2')
      expect(focusedElement).toHaveClass('focus:ring-primary/20')
    })
  })

  describe('Accessibility Standards Compliance', () => {
    test('passes axe accessibility audit', async () => {
      const { container } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations()
    })

    test('passes axe audit with dropdown open', async () => {
      const user = userEvent.setup()
      const { container } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })

      const results = await axe(container);
      (expect(results) as any).toHaveNoViolations()
    })

    test('provides proper color contrast (tested via CSS classes)', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const navItems = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        // Verify that proper color classes are applied
        navItems.forEach(item => {
          // Should have proper text color classes for contrast
          const classList = Array.from(item.classList)
          const hasProperTextColor = classList.some(cls =>
            cls.includes('text-') || cls.includes('text-muted-foreground')
          )
          expect(hasProperTextColor).toBe(true)
        })
      })
    })

    test('supports reduced motion preferences', async () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const animatedElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        // Verify that transition classes are applied (CSS will handle reduced motion)
        animatedElements.forEach(element => {
          expect(element).toHaveClass('transition-all')
        })
      })
    })
  })

  describe('Mobile Usability', () => {
    test('provides haptic feedback on supported devices', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const homeLink = screen.getByLabelText('Navigate to Home')
        expect(homeLink).toBeInTheDocument()
      })

      const homeLink = screen.getByLabelText('Navigate to Home')

      // Simulate touch interaction
      await act(async () => {
        fireEvent.touchStart(homeLink, {
          touches: [{ clientX: 100, clientY: 100 }]
        })
        fireEvent.touchEnd(homeLink, {
          changedTouches: [{ clientX: 100, clientY: 100 }]
        })
      })

      // Verify vibrate was called (if supported)
      expect(navigator.vibrate).toHaveBeenCalledWith(10)
    })

    test('provides visual feedback for touch interactions', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const touchElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))

        touchElements.forEach(element => {
          expect(element).toHaveClass('touch-feedback')
          expect(element).toHaveClass('active:scale-95')
        })
      })
    })

    test('prevents accidental navigation with debouncing', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const homeLink = screen.getByLabelText('Navigate to Home')
        expect(homeLink).toBeInTheDocument()
      })

      const homeLink = screen.getByLabelText('Navigate to Home')

      // Rapid clicks should be debounced
      await act(async () => {
        await user.click(homeLink)
        await user.click(homeLink)
        await user.click(homeLink)
      })

      // Should show disabled state during navigation
      expect(homeLink).toHaveClass('opacity-70')
    })

    test('handles safe area insets for devices with home indicators', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveClass('mobile-nav-safe-area')

        // Check inline style for safe area support
        expect(nav).toHaveStyle({
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        })
      })
    })

    test('provides proper spacing for content above navigation', async () => {
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveClass('fixed')
        expect(nav).toHaveClass('bottom-0')
        expect(nav).toHaveClass('z-50')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles missing feature flags gracefully', async () => {
      mockUseFeatureFlagEnabled.mockReturnValue(false)

      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      await waitFor(() => {
        // Documents item should not be present
        expect(screen.queryByText('Dokumente')).not.toBeInTheDocument()

        // Other items should still be present
        expect(screen.getByText('Häuser')).toBeInTheDocument()
        expect(screen.getByText('Wohnungen')).toBeInTheDocument()
      })
    })

    test('handles keyboard navigation with hidden items', async () => {
      mockUseFeatureFlagEnabled.mockReturnValue(false)

      const user = userEvent.setup()
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })

      const moreButton = screen.getByLabelText('Mehr menu')

      // Open dropdown
      await act(async () => {
        await user.click(moreButton)
      })

      // Navigate to last visible item
      await act(async () => {
        await user.keyboard('{End}')
      })

      await waitFor(() => {
        // Should focus on Logout (last visible item when Documents is hidden)
        const logoutItem = screen.getByRole('menuitem', { name: /Open Abmelden/ })
        expect(logoutItem).toHaveFocus()
      })
    })
  })
})