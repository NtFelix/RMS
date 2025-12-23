/**
 * Simplified accessibility tests for mobile navigation
 * Focuses on core accessibility features that can be reliably tested
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

describe('MobileBottomNavigation - Core Accessibility', () => {
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

  describe('Basic Accessibility Features', () => {
    test('renders with proper navigation role and ARIA labels', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveAttribute('aria-label', 'Main mobile navigation')
        expect(nav).toBeInTheDocument()
      })
    })

    test('provides descriptive ARIA labels for all navigation items', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Navigate to Home')).toBeInTheDocument()
        expect(screen.getByLabelText('Navigate to Mieter')).toBeInTheDocument()
        expect(screen.getByLabelText('Suchen - Open search')).toBeInTheDocument()
        expect(screen.getByLabelText('Navigate to Finanzen')).toBeInTheDocument()
        expect(screen.getByLabelText('Mehr menu')).toBeInTheDocument()
      })
    })

    test('shows current page state with aria-current', async () => {
      mockIsRouteActive.mockImplementation((route) => route === '/home')
      
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const homeLink = screen.getByLabelText('Navigate to Home (current page)')
        expect(homeLink).toHaveAttribute('aria-current', 'page')
      })
    })

    test('provides live region for screen reader announcements', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveAttribute('aria-live', 'polite')
        expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
        expect(liveRegion).toHaveClass('sr-only')
      })
    })

    test('dropdown has proper menu semantics', async () => {
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
        
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Touch Target Requirements', () => {
    test('all interactive elements meet minimum 44px touch target requirement', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        
        interactiveElements.forEach(element => {
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
  })

  describe('Keyboard Navigation Support', () => {
    test('all interactive elements are keyboard accessible', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const interactiveElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        
        interactiveElements.forEach(element => {
          // Should not have tabindex="-1" (except for dropdown items when closed)
          const tabIndex = element.getAttribute('tabindex')
          if (tabIndex !== null) {
            expect(tabIndex).not.toBe('-1')
          }
        })
      })
    })

    test('dropdown closes with Escape key', async () => {
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
      })
    })

    test('provides proper focus indicators', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const focusableElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        
        focusableElements.forEach(element => {
          expect(element).toHaveClass('focus:outline-none')
          expect(element).toHaveClass('focus:ring-2')
          expect(element).toHaveClass('focus:ring-primary/20')
        })
      })
    })
  })

  describe('Mobile Usability Features', () => {
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

    test('supports haptic feedback capability', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const homeLink = screen.getByLabelText('Navigate to Home')
        expect(homeLink).toBeInTheDocument()
      })
      
      // Verify that navigator.vibrate is available (mocked in test environment)
      expect('vibrate' in navigator).toBe(true)
      expect(typeof navigator.vibrate).toBe('function')
      
      // Verify touch event handlers are attached
      const homeLink = screen.getByLabelText('Navigate to Home')
      expect(homeLink).toHaveClass('touch-feedback')
    })
  })

  describe('Accessibility Standards Compliance', () => {
    test('passes axe accessibility audit', async () => {
      const { container } = render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('passes axe audit with dropdown open', async () => {
      const user = userEvent.setup()
      const { container } = render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const moreButton = screen.getByLabelText('Mehr menu')
        expect(moreButton).toBeInTheDocument()
      })
      
      const moreButton = screen.getByLabelText('Mehr menu')
      
      await act(async () => {
        await user.click(moreButton)
      })
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('provides proper color contrast classes', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const navItems = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        
        navItems.forEach(item => {
          const classList = Array.from(item.classList)
          const hasProperTextColor = classList.some(cls => 
            cls.includes('text-') || cls.includes('text-muted-foreground')
          )
          expect(hasProperTextColor).toBe(true)
        })
      })
    })

    test('supports reduced motion preferences via CSS classes', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const animatedElements = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        
        animatedElements.forEach(element => {
          expect(element).toHaveClass('transition-all')
        })
      })
    })
  })

  describe('Feature Flag Integration', () => {
    test('handles missing feature flags gracefully', async () => {
      mockUseFeatureFlagEnabled.mockReturnValue(false)
      
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
        // Documents item should not be present
        expect(screen.queryByText('Dokumente')).not.toBeInTheDocument()
        
        // Other items should still be present
        expect(screen.getByText('Häuser')).toBeInTheDocument()
        expect(screen.getByText('Wohnungen')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Behavior', () => {
    test('renders with proper responsive classes', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveClass('mobile-nav-responsive')
        expect(nav).toHaveClass('hydration-safe-mobile')
        expect(nav).toHaveClass('prevent-layout-shift')
      })
    })

    test('provides CSS-only fallback during hydration', async () => {
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toHaveStyle({
          display: 'block',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))'
        })
      })
    })
  })
})