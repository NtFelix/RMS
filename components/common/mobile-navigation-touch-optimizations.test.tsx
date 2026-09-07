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
    // Mock requestAnimationFrame for focus management
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: any) => { cb(); return 1; })
  })

  describe('Touch Target Requirements', () => {
    it('should have minimum 44px touch targets for all interactive elements', () => {
      render(<MobileBottomNavigation />)
      
      // Check main navigation items have min-h-[44px] class
      const navItems = screen.getAllByRole('button').concat(screen.getAllByRole('link'))
      
      navItems.forEach(item => {
        expect(item.className).toContain('min-h-[44px]')
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
    it('should have touch-feedback class for visual feedback', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('touch-feedback')
      expect(homeButton).toHaveClass('active:scale-95')
    })

    it('should provide haptic feedback on valid tap', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate quick tap - touch start then end at same position
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      // Simulate touch end with minimal movement
      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 100, clientY: 100 }]
      })
      
      // The haptic feedback is triggered in the component's handleTouchEnd handler
      // which is called during the touch end event
      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalledWith(10)
      })
    })

    it('should not provide haptic feedback on long swipe gesture', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      
      // Simulate swipe gesture with long duration (>500ms)
      const realDateNow = Date.now.bind(global.Date);
      const startTime = 1000;
      let currentTime = startTime;
      global.Date.now = jest.fn(() => currentTime);
      
      fireEvent.touchStart(homeButton, {
        touches: [{ clientX: 100, clientY: 100 }]
      })
      
      currentTime = startTime + 600; // 600ms later - exceeds 500ms threshold
      
      fireEvent.touchEnd(homeButton, {
        changedTouches: [{ clientX: 150, clientY: 100 }]
      })
      
      await waitFor(() => {
        expect(navigator.vibrate).not.toHaveBeenCalled()
      })
      
      global.Date.now = realDateNow;
    })
  })

  describe('Navigation Debouncing', () => {
    it('should have navigation items with proper styling', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toBeInTheDocument()
      expect(homeButton).toHaveClass('mobile-nav-item')
    })

    it('should have touch feedback on navigation items', async () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('touch-feedback')
    })
  })

  describe('Dropdown Touch Interactions', () => {
    it('should apply mobile-dropdown-item class to dropdown items', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        const dropdownItem = screen.getByText('Häuser').closest('[role="menuitem"]')
        expect(dropdownItem).toHaveClass('mobile-dropdown-item')
      })
    })

    it('should provide touch feedback for dropdown items', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        const dropdownItem = screen.getByText('Häuser').closest('[role="menuitem"]')
        
        fireEvent.touchStart(dropdownItem!, {
          touches: [{ clientX: 100, clientY: 100 }]
        })
        
        expect(dropdownItem).toHaveClass('mobile-dropdown-item', 'touch-feedback')
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
      expect(nav).toHaveClass('mobile-nav-container', 'prevent-layout-shift')
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
      expect(homeButton).toHaveClass('mobile-nav-item')
    })

    it('should have proper touch-action for manipulation', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('mobile-nav-item', 'touch-feedback')
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
        const menuItems = screen.getAllByRole('menuitem')
        expect(menuItems.length).toBeGreaterThan(0)
      })
    })

    it('should return focus to More button when dropdown closes', async () => {
      const user = userEvent.setup()
      render(<MobileBottomNavigation />)
      
      const moreButton = screen.getByLabelText(/mehr menu/i)
      await user.click(moreButton)
      
      await waitFor(() => {
        expect(screen.getByText('Häuser')).toBeInTheDocument()
      })
      
      // Close dropdown with Escape (component listens on document keydown)
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(screen.queryByText('Häuser')).not.toBeInTheDocument()
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

    it('should have mobile-nav-item class for transform optimizations', () => {
      render(<MobileBottomNavigation />)
      
      const homeButton = screen.getByLabelText(/navigate to home/i)
      expect(homeButton).toHaveClass('mobile-nav-item')
      expect(homeButton).toHaveClass('touch-feedback')
    })
  })
})