/**
 * Simplified Responsive Behavior Tests for Mobile Navigation
 * 
 * This test suite focuses specifically on the mobile navigation component
 * and verifies responsive behavior across different screen sizes.
 * 
 * Requirements tested:
 * - 4.1: Navigation switching at 768px breakpoint
 * - 4.2: Layout on various mobile device sizes (320px to 767px)
 * - 4.3: Tablet-sized screens for appropriate navigation choice
 * - 4.4: No layout breaks during screen size transitions
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'
import { usePathname } from 'next/navigation'

// Mock Next.js hooks and components
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
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

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(() => true),
}))

// Mock hooks
jest.mock('@/hooks/use-active-state-manager', () => ({
  useSidebarActiveState: () => ({
    isRouteActive: jest.fn((route: string) => route === '/home'),
  }),
}))

jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    setOpen: jest.fn(),
  }),
}))

// Mock window.matchMedia for responsive testing
const mockMatchMedia = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query.includes('768px') ? width >= 768 : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Helper function to simulate window resize
const simulateResize = (width: number, height: number = 800) => {
  act(() => {
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
    
    // Trigger resize event
    const resizeEvent = new Event('resize')
    window.dispatchEvent(resizeEvent)
  })
}

// Helper function to wait for component updates after resize
const waitForResizeUpdate = async () => {
  await act(async () => {
    // Wait for debounced resize handler (150ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 200))
  })
}

describe('Mobile Navigation Responsive Behavior - Simplified', () => {
  const mockPathname = usePathname as jest.Mock

  beforeEach(() => {
    mockPathname.mockReturnValue('/home')
    
    // Reset window size to mobile by default
    mockMatchMedia(375)
    
    // Mock navigator.vibrate for touch feedback tests
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Requirement 4.1: Navigation switching at 768px breakpoint', () => {
    it('should render mobile navigation below 768px', async () => {
      mockMatchMedia(767)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should be visible
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
        
        // Should have all 5 primary navigation items
        expect(screen.getByLabelText(/navigate to home/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/navigate to mieter/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/suchen.*open search/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/navigate to finanzen/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/mehr menu/i)).toBeInTheDocument()
      })
    })

    it('should not render mobile navigation at 768px and above', async () => {
      mockMatchMedia(768)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should not be rendered on desktop
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })
    })

    it('should handle breakpoint transition properly', async () => {
      // Start with mobile
      mockMatchMedia(767)
      
      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })

      // Resize to desktop
      simulateResize(768)
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should be hidden on desktop
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Requirement 4.2: Layout on various mobile device sizes (320px to 767px)', () => {
    const mobileScreenSizes = [
      { name: 'iPhone SE', width: 320, height: 568 },
      { name: 'iPhone 12 Mini', width: 375, height: 812 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPhone 12 Pro Max', width: 428, height: 926 },
      { name: 'Samsung Galaxy S8', width: 360, height: 740 },
      { name: 'Samsung Galaxy S20', width: 412, height: 915 },
      { name: 'Large Mobile', width: 480, height: 800 },
      { name: 'Small Tablet Portrait', width: 600, height: 960 },
      { name: 'Large Mobile Landscape', width: 767, height: 400 },
    ]

    mobileScreenSizes.forEach(({ name, width, height }) => {
      it(`should render properly on ${name} (${width}x${height})`, async () => {
        mockMatchMedia(width)
        
        render(<MobileBottomNavigation />)

        await waitFor(() => {
          const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
          expect(mobileNav).toBeInTheDocument()
          
          // Check that navigation is positioned correctly
          expect(mobileNav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
          
          // Verify all navigation items are present
          const navItems = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
          const navigationButtons = navItems.filter(item => 
            item.getAttribute('aria-label')?.includes('Navigate to') ||
            item.getAttribute('aria-label')?.includes('menu') ||
            item.getAttribute('aria-label')?.includes('search')
          )
          
          expect(navigationButtons.length).toBeGreaterThanOrEqual(5)
          
          // Check that navigation has proper responsive classes
          expect(mobileNav).toHaveClass('mobile-nav-responsive')
          expect(mobileNav).toHaveClass('hydration-safe-mobile')
        })
      })
    })

    it('should maintain proper spacing on narrow screens (320px)', async () => {
      mockMatchMedia(320)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
        expect(mobileNav).toBeInTheDocument()
        
        // Check that navigation container has proper flex layout
        const navContainer = mobileNav.querySelector('.flex.items-center.justify-around')
        expect(navContainer).toBeInTheDocument()
        
        // Verify navigation items don't overflow
        const navItems = screen.getAllByRole('link').concat(screen.getAllByRole('button'))
        const navigationButtons = navItems.filter(item => 
          item.getAttribute('aria-label')?.includes('Navigate to') ||
          item.getAttribute('aria-label')?.includes('menu') ||
          item.getAttribute('aria-label')?.includes('search')
        )
        
        // Should have exactly 5 primary navigation items
        expect(navigationButtons).toHaveLength(5)
      })
    })
  })

  describe('Requirement 4.3: Tablet-sized screens for appropriate navigation choice', () => {
    const tabletScreenSizes = [
      { name: 'iPad Mini Portrait', width: 768, height: 1024 },
      { name: 'iPad Portrait', width: 820, height: 1180 },
      { name: 'iPad Air Portrait', width: 834, height: 1194 },
      { name: 'iPad Pro 11" Portrait', width: 834, height: 1194 },
      { name: 'iPad Pro 12.9" Portrait', width: 1024, height: 1366 },
      { name: 'Surface Pro Portrait', width: 912, height: 1368 },
    ]

    tabletScreenSizes.forEach(({ name, width, height }) => {
      it(`should not render mobile navigation on ${name} (${width}x${height})`, async () => {
        mockMatchMedia(width)
        
        render(<MobileBottomNavigation />)

        await waitFor(() => {
          // Mobile navigation should not be rendered on tablet sizes
          expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
        })
      })
    })

    it('should handle tablet landscape orientations properly', async () => {
      // Tablet in landscape (width > height)
      mockMatchMedia(1024)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        // Should not render mobile navigation in landscape
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('Requirement 4.4: No layout breaks during screen size transitions', () => {
    it('should handle smooth transition from mobile to desktop', async () => {
      // Start with mobile
      mockMatchMedia(375)
      
      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })

      // Transition to desktop
      simulateResize(1024)
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should be gone
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })
    })

    it('should handle smooth transition from desktop to mobile', async () => {
      // Start with desktop
      mockMatchMedia(1024)
      
      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })

      // Transition to mobile
      simulateResize(375)
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should appear
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })
    })

    it('should handle rapid screen size changes without breaking', async () => {
      const { rerender } = render(<MobileBottomNavigation />)

      // Rapidly change screen sizes
      const sizes = [375, 768, 1024, 600, 320, 1200, 767, 769]
      
      for (const size of sizes) {
        simulateResize(size)
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 50))
        })
        
        rerender(<MobileBottomNavigation />)
        
        // Navigation should be appropriate for screen size
        if (size < 768) {
          await waitFor(() => {
            expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
          }, { timeout: 300 })
        } else {
          await waitFor(() => {
            expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
          }, { timeout: 300 })
        }
      }
    })

    it('should maintain dropdown state during screen transitions', async () => {
      // Start with mobile and open dropdown
      mockMatchMedia(375)
      
      const { rerender } = render(<MobileBottomNavigation />)

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })

      // Open the "More" dropdown
      const moreButton = screen.getByLabelText(/mehr menu/i)
      fireEvent.click(moreButton)

      await waitFor(() => {
        expect(screen.getByRole('menu', { name: /more navigation options/i })).toBeInTheDocument()
      })

      // Transition to desktop size
      simulateResize(1024)
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should be hidden on desktop
        expect(screen.queryByRole('navigation', { name: /main mobile navigation/i })).not.toBeInTheDocument()
      })

      // Transition back to mobile
      simulateResize(375)
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      await waitFor(() => {
        // Mobile navigation should be back
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
        
        // Dropdown should be closed (proper state reset)
        expect(screen.queryByRole('menu', { name: /more navigation options/i })).not.toBeInTheDocument()
      })
    })

    it('should prevent layout shift during hydration', async () => {
      // Test hydration safety by checking CSS classes
      mockMatchMedia(375)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
        
        // Should have hydration-safe classes
        expect(mobileNav).toHaveClass('hydration-safe-mobile')
        expect(mobileNav).toHaveClass('prevent-layout-shift')
      })
    })

    it('should handle CSS-only fallbacks properly', async () => {
      // Test that CSS classes provide proper fallback behavior
      mockMatchMedia(375)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        // Check mobile navigation CSS classes
        const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
        expect(mobileNav).toHaveClass('mobile-nav-responsive')
        expect(mobileNav).toHaveClass('mobile-nav-safe-area')
        expect(mobileNav).toHaveClass('mobile-nav-container')
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle window resize events with debouncing', async () => {
      mockMatchMedia(375)
      
      const { rerender } = render(<MobileBottomNavigation />)

      // Simulate multiple rapid resize events
      for (let i = 0; i < 10; i++) {
        simulateResize(375 + i * 10)
      }

      // Wait for debounced handler
      await waitForResizeUpdate()

      rerender(<MobileBottomNavigation />)

      // Should still work properly after rapid resizes
      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })
    })

    it('should handle safe area insets on mobile devices', async () => {
      mockMatchMedia(375)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
        expect(mobileNav).toHaveClass('mobile-nav-safe-area')
      })
    })

    it('should handle dropdown functionality on mobile', async () => {
      mockMatchMedia(375)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const mobileNav = screen.getByRole('navigation', { name: /main mobile navigation/i })
        expect(mobileNav).toBeInTheDocument()
      })

      // Test dropdown functionality
      const moreButton = screen.getByLabelText(/mehr menu/i)
      fireEvent.click(moreButton)

      await waitFor(() => {
        expect(screen.getByRole('menu', { name: /more navigation options/i })).toBeInTheDocument()
      })

      // Test dropdown items
      expect(screen.getByText('Häuser')).toBeInTheDocument()
      expect(screen.getByText('Wohnungen')).toBeInTheDocument()
      expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
      expect(screen.getByText('Aufgaben')).toBeInTheDocument()
    })

    it('should handle active state highlighting correctly', async () => {
      mockMatchMedia(375)
      
      render(<MobileBottomNavigation />)

      await waitFor(() => {
        const homeLink = screen.getByLabelText(/navigate to home/i)
        expect(homeLink).toHaveClass('bg-primary/10', 'text-primary')
        
        const mieterLink = screen.getByLabelText(/navigate to mieter/i)
        expect(mieterLink).toHaveClass('text-muted-foreground')
      })
    })
  })
})