import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileBottomNavigation from '@/components/common/mobile-bottom-navigation'

// Mock hooks
jest.mock('@/hooks/use-active-state-manager', () => ({
  useSidebarActiveState: () => ({
    isRouteActive: jest.fn(() => false)
  })
}))

jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({
    setOpen: jest.fn()
  })
}))

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => true
}))

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn()
})

// Mock window.innerWidth for mobile viewport
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 375 // Mobile width
})

describe('MobileBottomNavigation Touch Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset window width to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
  })

  describe('Touch Target Requirements', () => {
    it('should have minimum 44px touch targets for all interactive elements', () => {
      render(<MobileBottomNavigation />)
      
      // Check main navigation items
      const navItems = screen.getAllByRole('button').concat(screen.getAllByRole('link'))
      
      navItems.forEach(item => {
        const styles = window.getComputedStyle(item)
        const minHeight = parseInt(styles.minHeight)
        const minWidth = parseInt(styles.minWidth)
        
        expect(minHeight).toBeGreaterThanOrEqual(44)
        expect(minWidth).toBeGreaterThanOrEqual(44)
      })
    })

    it('should apply mobile-nav-item class to navigation items', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('mobile-nav-item')
    })

    it('should apply touch-feedback class to interactive elements', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('touch-feedback')
    })
  })

  describe('Touch Feedback', () => {
    it('should provide visual feedback on touch start', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate touch start
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      await waitFor(() => {
        expect(homeButton).toHaveClass('scale-95', 'bg-accent/20')
      })
    })

    it('should clear touch feedback on touch end', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate touch start and end
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Wait for feedback to clear
      await waitFor(() => {
        expect(homeButton).not.toHaveClass('scale-95', 'bg-accent/20')
      }, { timeout: 200 })
    })

    it('should provide haptic feedback on valid tap', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate quick tap
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Short delay to simulate quick tap
      setTimeout(() => {
        fireEvent.touchEnd(homeButton, {
          changedTouches: [{ clientX: 100, clientY: 100 }]
        })
      }, 100)
      
      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(10)
      })
    })

    it('should not provide haptic feedback on long press', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate long press
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Long delay to simulate long press
      setTimeout(() => {
        fireEvent.touchEnd(homeButton, {
          changedTouches: [{ clientX: 100, clientY: 100 }]
        })
      }, 600)
      
      await waitFor(() => {
        expect(navigator.vibrate).not.toHaveBeenCalled()
      })
    })

    it('should not provide haptic feedback on swipe gesture', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate swipe gesture
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 150, clientY: 100 }] // Moved 50px horizontally
      })
      
      await waitFor(() => {
        expect(navigator.vibrate).not.toHaveBeenCalled()
      })
    })
  })

  describe('Navigation Debouncing', () => {
    it('should prevent rapid navigation attempts', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Rapid clicks
      await user.click(homeButton)
      await user.click(homeButton)
      await user.click(homeButton)
      
      // Should be disabled during navigation
      expect(homeButton).toHaveClass('opacity-70', 'pointer-events-none')
    })

    it('should re-enable navigation after debounce period', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      await user.click(homeButton)
      
      // Wait for debounce period to complete
      await waitFor(() => {
        expect(homeButton).not.toHaveClass('opacity-70', 'pointer-events-none')
      }, { timeout: 500 })
    })

    it('should debounce dropdown toggle', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      
      // Rapid clicks on More button
      await user.click(moreButton)
      await user.click(moreButton)
      await user.click(moreButton)
      
      // Should be disabled during navigation
      expect(moreButton).toHaveClass('opacity-70', 'pointer-events-none')
    })
  })

  describe('Dropdown Touch Interactions', () => {
    it('should apply mobile-dropdown-item class to dropdown items', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        const dropdownItem = screen.getByText('Häuser')
        expect(dropdownItem).toHaveClass('mobile-dropdown-item')
      })
    })

    it('should provide touch feedback for dropdown items', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        const dropdownItem = screen.getByText('Häuser')
        
        fireEvent.touchStart(dropdownItem, {
          touches: [{ clientX: 100, clientY: 100 }]
        })
        
        expect(dropdownItem).toHaveClass('scale-95', 'bg-accent/20')
      })
    })

    it('should close dropdown on touch outside', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      // Wait for dropdown to open
      await waitFor(() => {
        expect(screen.getByText('Häuser')).toBeInTheDocument()
      })
      
      // Touch outside dropdown
      fireEvent.touchStart(document.body, {
        touches: [{ clientX: 10, clientY: 10 }]
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Häuser')).not.toBeInTheDocument()
      })
    })

    it('should optimize dropdown timing for touch interactions', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      // Should have longer delay for touch interactions (200ms vs 100ms)
      await waitFor(() => {
        const dropdownItem = screen.getByText('Häuser')
        expect(dropdownItem).toBeInTheDocument()
      }, { timeout: 250 })
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply mobile navigation container classes', () => {
      render(<MobileBottomNavigation />)
      
      const nav = screen.getByRole('navigation', { name: /main mobile navigation/i })
      expect(nav).toHaveClass('mobile-nav-container', 'mobile-nav-safe-area')
    })

    it('should apply mobile dropdown classes', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        const dropdown = screen.getByRole('menu', { name: /more navigation options/i })
        expect(dropdown).toHaveClass('mobile-dropdown')
      })
    })

    it('should prevent text selection on touch elements', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      const styles = window.getComputedStyle(homeButton)
      
      expect(styles.userSelect).toBe('none')
    })

    it('should have proper touch-action for manipulation', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('mobile-nav-item')
      
      // CSS class should apply touch-action: manipulation
      const styles = window.getComputedStyle(homeButton)
      expect(styles.touchAction).toBe('manipulation')
    })
  })

  describe('Accessibility with Touch', () => {
    it('should maintain focus management during touch interactions', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      
      // Focus and open dropdown
      moreButton.focus()
      await user.click(moreButton)
      
      await waitFor(() => {
        const firstDropdownItem = screen.getByText('Häuser')
        expect(firstDropdownItem).toHaveFocus()
      })
    })

    it('should return focus to More button when dropdown closes', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      // Close dropdown with Escape
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(moreButton).toHaveFocus()
      })
    })

    it('should provide proper ARIA labels for touch interactions', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveAttribute('aria-label')
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      expect(moreButton).toHaveAttribute('aria-expanded')
      expect(moreButton).toHaveAttribute('aria-haspopup', 'menu')
    })
  })

  describe('Performance Optimizations', () => {
    it('should use optimized transition durations for touch', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('duration-200') // Faster transitions for touch
    })

    it('should prevent layout shift during touch interactions', () => {
      render(<MobileBottomNavigation />)
      
      const nav = screen.getByRole('navigation', { name: /main mobile navigation/i })
      expect(nav).toHaveClass('prevent-layout-shift')
    })

    it('should use will-change for transform optimizations', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('mobile-nav-item')
      
      // CSS class should apply will-change: transform, background-color, color
      const styles = window.getComputedStyle(homeButton)
      expect(styles.willChange).toContain('transform')
    })
  })
})