import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'

// Mock hooks
jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    setOpen: jest.fn()
  })
}))

jest.mock('@/hooks/use-active-state-manager', () => ({
  useSidebarActiveState: () => ({
    isRouteActive: jest.fn(() => false)
  })
}))

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  })
}))

// Mock window.innerWidth for responsive testing
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

// Mock resize event
const mockResizeEvent = (width: number) => {
  mockInnerWidth(width)
  window.dispatchEvent(new Event('resize'))
}

describe('Mobile Navigation Responsive Behavior', () => {
  beforeEach(() => {
    // Reset window size before each test
    mockInnerWidth(1024) // Desktop by default
    jest.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any timers only if fake timers are active
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
    }
  })

  describe('Hydration Safety', () => {
    it('should render CSS-only fallback before hydration', () => {
      // Mock mobile viewport
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      // Should render the CSS-only fallback navigation
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveClass('mobile-nav-responsive')
      expect(nav).toHaveClass('hydration-safe-mobile')
      expect(nav).toHaveClass('prevent-layout-shift')
    })

    it('should render static fallback navigation items before hydration', () => {
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      // Should render the CSS-only fallback with static navigation items
      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
      expect(nav).toHaveClass('mobile-nav-responsive')
      expect(nav).toHaveClass('hydration-safe-mobile')
      expect(nav).toHaveClass('prevent-layout-shift')

      // Should have static navigation items in fallback
      const navItems = container.querySelectorAll('.flex.flex-col.items-center')
      expect(navItems.length).toBeGreaterThan(0)
    })
  })

  describe('Responsive Breakpoint Behavior', () => {
    it('should handle mobile to desktop transition', async () => {
      jest.useFakeTimers()
      mockInnerWidth(375) // Start mobile

      const { rerender } = render(<MobileBottomNavigation />)

      // Wait for component to mount
      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      // Should be visible on mobile
      expect(screen.queryByRole('navigation')).toBeInTheDocument()

      // Resize to desktop
      act(() => {
        mockResizeEvent(1024)
        jest.advanceTimersByTime(200) // Wait for debounce
      })

      // Should be hidden on desktop
      await waitFor(() => {
        const nav = screen.queryByRole('navigation')
        expect(nav).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })

    it('should handle desktop to mobile transition', async () => {
      jest.useFakeTimers()
      mockInnerWidth(1024) // Start desktop

      render(<MobileBottomNavigation />)

      // Wait for component to mount
      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      // Should be hidden on desktop
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument()

      // Resize to mobile
      act(() => {
        mockResizeEvent(375)
        jest.advanceTimersByTime(200) // Wait for debounce
      })

      // Should be visible on mobile
      await waitFor(() => {
        expect(screen.queryByRole('navigation')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })

    it('should properly handle 768px breakpoint', async () => {
      jest.useFakeTimers()

      // Test just below breakpoint (mobile)
      mockInnerWidth(767)
      const { rerender } = render(<MobileBottomNavigation />)

      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      expect(screen.queryByRole('navigation')).toBeInTheDocument()

      // Test at breakpoint (desktop)
      act(() => {
        mockResizeEvent(768)
        jest.advanceTimersByTime(200)
      })

      await waitFor(() => {
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('CSS-only Fallbacks', () => {
    it('should have proper CSS classes for responsive behavior', () => {
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('mobile-nav-responsive')
      expect(nav).toHaveClass('hydration-safe-mobile')
      expect(nav).toHaveClass('prevent-layout-shift')
    })

    it('should have proper CSS classes for hydration safety', () => {
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('mobile-nav-responsive')
      expect(nav).toHaveClass('hydration-safe-mobile')
      expect(nav).toHaveClass('prevent-layout-shift')

      // Should have proper responsive display style
      expect(nav).toHaveStyle('display: block')
    })
  })

  describe('Debounced Resize Handling', () => {
    it('should debounce resize events to prevent excessive re-renders', async () => {
      jest.useFakeTimers()
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      // Wait for initial mount
      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      // Trigger multiple rapid resize events
      act(() => {
        mockResizeEvent(400)
        mockResizeEvent(500)
        mockResizeEvent(600)
        mockResizeEvent(700)
        mockResizeEvent(800) // Final desktop size
      })

      // Should not process until debounce timeout
      expect(screen.queryByRole('navigation')).toBeInTheDocument()

      // Advance past debounce timeout
      act(() => {
        jest.advanceTimersByTime(200)
      })

      // Should now be hidden (desktop)
      await waitFor(() => {
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Screen Reader Announcements', () => {
    it('should have screen reader announcement container', async () => {
      jest.useFakeTimers()
      mockInnerWidth(375)

      const { container } = render(<MobileBottomNavigation />)

      // Wait for mount
      await act(async () => {
        jest.advanceTimersByTime(200)
      })

      // Should have screen reader announcement container
      const announcementContainer = container.querySelector('[aria-live="polite"]')
      expect(announcementContainer).toBeInTheDocument()
      expect(announcementContainer).toHaveAttribute('role', 'status')
      expect(announcementContainer).toHaveClass('sr-only')

      jest.useRealTimers()
    })
  })
})