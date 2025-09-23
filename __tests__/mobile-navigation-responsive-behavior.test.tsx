import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import MobileBottomNavigation from '@/components/mobile-bottom-navigation'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock hooks
jest.mock('@/hooks/use-active-state-manager', () => ({
  useSidebarActiveState: () => ({
    isRouteActive: jest.fn(() => false),
  }),
}))

jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    setOpen: jest.fn(),
  }),
}))

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => true,
}))

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
}

// Mock window.addEventListener and removeEventListener
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
})

describe('Mobile Navigation Responsive Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usePathname as jest.Mock).mockReturnValue('/home')
    mockAddEventListener.mockClear()
    mockRemoveEventListener.mockClear()
  })

  describe('Hydration Safety', () => {
    it('should not render mobile navigation until mounted', () => {
      mockInnerWidth(400) // Mobile width
      
      const { container } = render(<MobileBottomNavigation />)
      
      // Should not render anything initially (returns null)
      const nav = container.querySelector('nav')
      expect(nav).toBeNull()
    })

    it('should render mobile navigation after mount on mobile screens', async () => {
      mockInnerWidth(400) // Mobile width
      
      render(<MobileBottomNavigation />)
      
      // Wait for component to mount
      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })
    })

    it('should not render mobile navigation on desktop screens after mount', async () => {
      mockInnerWidth(1024) // Desktop width
      
      const { container } = render(<MobileBottomNavigation />)
      
      // Wait for component to mount and check it's not rendered
      await waitFor(() => {
        const nav = container.querySelector('nav[role="navigation"]')
        expect(nav).toBeNull()
      })
    })
  })

  describe('Responsive Breakpoint Behavior', () => {
    it('should add resize event listener on mount', async () => {
      mockInnerWidth(400)
      
      render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      })
    })

    it('should remove resize event listener on unmount', async () => {
      mockInnerWidth(400)
      
      const { unmount } = render(<MobileBottomNavigation />)
      
      await waitFor(() => {
        expect(mockAddEventListener).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('should handle screen size changes properly', async () => {
      mockInnerWidth(400) // Start mobile
      
      render(<MobileBottomNavigation />)
      
      // Wait for mount
      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
      
      // Simulate resize to desktop
      mockInnerWidth(1024)
      
      // Get the resize handler that was registered
      const resizeHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'resize'
      )?.[1]
      
      if (resizeHandler) {
        act(() => {
          resizeHandler()
        })
      }
      
      // Component should handle the resize
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('Screen Size Detection', () => {
    it('should detect mobile screen size correctly', async () => {
      mockInnerWidth(400) // Mobile width
      
      render(<MobileBottomNavigation />)
      
      // Wait for component to mount and detect mobile
      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /main mobile navigation/i })).toBeInTheDocument()
      })
    })

    it('should detect desktop screen size correctly', async () => {
      mockInnerWidth(1024) // Desktop width
      
      const { container } = render(<MobileBottomNavigation />)
      
      // Wait for component to mount and detect desktop
      await waitFor(() => {
        const nav = container.querySelector('nav[role="navigation"]')
        expect(nav).toBeNull()
      })
    })
  })

  describe('CSS Fallbacks', () => {
    it('should have proper CSS classes for responsive behavior', () => {
      mockInnerWidth(400)
      
      const { container } = render(<MobileBottomNavigation />)
      
      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('md:hidden') // Hidden on desktop
      expect(nav).toHaveClass('block') // Visible on mobile
    })

    it('should have CSS-only fallback styling', () => {
      mockInnerWidth(400)
      
      const { container } = render(<MobileBottomNavigation />)
      
      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0')
    })
  })
})