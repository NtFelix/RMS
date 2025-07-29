import { render, screen, fireEvent } from '@testing-library/react'
import { PillTabSwitcher } from './pill-tab-switcher'

const mockTabs = [
  { id: '1', label: 'Login', value: 'login' },
  { id: '2', label: 'Register', value: 'register' }
]

// Mock the useIsMobile hook
jest.mock('./use-mobile', () => ({
  useIsMobile: jest.fn()
}))

const mockUseIsMobile = require('./use-mobile').useIsMobile

describe('PillTabSwitcher Responsive Design and Touch Optimization', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockUseIsMobile.mockReset()
  })

  describe('Desktop Behavior', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false)
    })

    it('should render with desktop-specific styling', () => {
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement
      const tabs = screen.getAllByRole('button')

      // Check desktop container styling
      expect(container).toHaveClass('h-12') // Desktop height
      expect(container).toHaveClass('p-2') // Desktop padding
      expect(container).toHaveClass('w-full', 'sm:w-auto') // Responsive width

      // Check desktop tab styling
      tabs.forEach(tab => {
        expect(tab).toHaveClass('px-6', 'py-2.5', 'text-sm') // Desktop spacing and text
        expect(tab).toHaveClass('min-h-[40px]') // Desktop minimum height
      })
    })

    it('should have hover effects enabled on desktop', () => {
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const registerTab = screen.getByRole('button', { name: 'Register' })

      // Check that desktop hover classes are present
      expect(registerTab).toHaveClass('hover:text-foreground')
      expect(registerTab).toHaveClass('hover:scale-105')
    })
  })

  describe('Mobile Behavior', () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true)
    })

    it('should render with mobile-specific styling for better touch targets', () => {
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement
      const tabs = screen.getAllByRole('button')

      // Check mobile container styling
      expect(container).toHaveClass('h-14') // Larger height for mobile
      expect(container).toHaveClass('p-2.5') // More padding for mobile
      expect(container).toHaveClass('touch-manipulation') // Touch optimization
      expect(container).toHaveClass('select-none') // Prevent text selection

      // Check mobile tab styling
      tabs.forEach(tab => {
        expect(tab).toHaveClass('px-8', 'py-3', 'text-base') // Larger spacing and text for mobile
        expect(tab).toHaveClass('min-h-[44px]') // Minimum 44px touch target
        expect(tab).toHaveClass('touch-manipulation') // Touch optimization
      })
    })

    it('should disable hover effects on mobile to prevent sticky hover', () => {
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const loginTab = screen.getByRole('button', { name: 'Login' })
      const registerTab = screen.getByRole('button', { name: 'Register' })

      // Active tab should have mobile-specific hover prevention
      expect(loginTab).toHaveClass('hover:scale-100', 'hover:bg-transparent')

      // Inactive tab should have mobile touch feedback instead of hover
      expect(registerTab).toHaveClass('active:bg-muted/40')
      expect(registerTab).toHaveClass('active:scale-[0.98]')
    })

    it('should handle touch events for better mobile feedback', () => {
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const registerTab = screen.getByRole('button', { name: 'Register' })

      // Test touch events don't throw errors and can be fired
      expect(() => {
        fireEvent.touchStart(registerTab)
        fireEvent.touchEnd(registerTab)
        fireEvent.touchCancel(registerTab)
      }).not.toThrow()

      // Verify the tab is properly configured for touch interaction
      expect(registerTab).toHaveClass('touch-manipulation')
      
      // Test that touch events can be triggered without causing errors
      fireEvent.touchStart(registerTab, { touches: [{ clientX: 0, clientY: 0 }] })
      fireEvent.touchEnd(registerTab)
      
      // Verify the component still functions after touch events
      expect(mockOnTabChange).not.toHaveBeenCalled() // Touch events shouldn't trigger tab change
      
      // But clicking should still work
      fireEvent.click(registerTab)
      expect(mockOnTabChange).toHaveBeenCalledWith('register')
    })
  })

  describe('Responsive Container Behavior', () => {
    it('should have responsive width classes', () => {
      mockUseIsMobile.mockReturnValue(false)
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement

      // Check responsive width classes
      expect(container).toHaveClass('w-full') // Full width on small screens
      expect(container).toHaveClass('sm:w-auto') // Auto width on larger screens
      expect(container).toHaveClass('max-w-sm') // Max width on mobile
      expect(container).toHaveClass('sm:max-w-none') // No max width on larger screens
    })

    it('should have proper touch optimization classes', () => {
      mockUseIsMobile.mockReturnValue(true)
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement
      const tabs = screen.getAllByRole('button')

      // Check touch optimization on container
      expect(container).toHaveClass('touch-manipulation')
      expect(container).toHaveClass('select-none')

      // Check touch optimization on tabs
      tabs.forEach(tab => {
        expect(tab).toHaveClass('touch-manipulation')
      })
    })
  })

  describe('Sliding Indicator Responsive Positioning', () => {
    it('should adjust indicator positioning for mobile padding', () => {
      mockUseIsMobile.mockReturnValue(true)
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement
      const indicator = container?.querySelector('.bg-primary')

      // Check mobile indicator positioning classes
      expect(indicator).toHaveClass('left-2.5', 'top-2.5', 'bottom-2.5')
    })

    it('should use desktop indicator positioning on larger screens', () => {
      mockUseIsMobile.mockReturnValue(false)
      const mockOnTabChange = jest.fn()
      
      render(
        <PillTabSwitcher
          tabs={mockTabs}
          activeTab="login"
          onTabChange={mockOnTabChange}
        />
      )

      const container = screen.getByRole('button', { name: 'Login' }).parentElement
      const indicator = container?.querySelector('.bg-primary')

      // Check desktop indicator positioning classes
      expect(indicator).toHaveClass('left-2', 'top-2', 'bottom-2')
    })
  })
})

describe('PillTabSwitcher Hover and Focus States', () => {
  beforeEach(() => {
    // Default to desktop for existing tests
    mockUseIsMobile.mockReturnValue(false)
  })
  it('should render tabs with proper hover and focus classes', () => {
    const mockOnTabChange = jest.fn()
    
    render(
      <PillTabSwitcher
        tabs={mockTabs}
        activeTab="login"
        onTabChange={mockOnTabChange}
      />
    )

    const loginTab = screen.getByRole('button', { name: 'Login' })
    const registerTab = screen.getByRole('button', { name: 'Register' })

    // Check that inactive tab has hover classes
    expect(registerTab).toHaveClass('hover:text-foreground')
    expect(registerTab).toHaveClass('hover:scale-105')

    // Check that active tab prevents hover scaling
    expect(loginTab).toHaveClass('hover:scale-100')

    // Check focus states
    expect(loginTab).toHaveClass('focus-visible:ring-2')
    expect(loginTab).toHaveClass('focus-visible:ring-primary/50')
    expect(loginTab).toHaveClass('focus-visible:bg-muted/30')
    expect(registerTab).toHaveClass('focus-visible:ring-2')
    expect(registerTab).toHaveClass('focus-visible:ring-primary/50')
    expect(registerTab).toHaveClass('focus-visible:bg-muted/30')
  })

  it('should have proper transition timing for state changes', () => {
    const mockOnTabChange = jest.fn()
    
    render(
      <PillTabSwitcher
        tabs={mockTabs}
        activeTab="login"
        onTabChange={mockOnTabChange}
      />
    )

    const tabs = screen.getAllByRole('button')
    
    tabs.forEach(tab => {
      expect(tab).toHaveClass('transition-all')
      expect(tab).toHaveClass('duration-200')
      expect(tab).toHaveClass('ease-out')
      expect(tab).toHaveClass('motion-reduce:transition-none')
    })
  })

  it('should handle focus events properly', () => {
    const mockOnTabChange = jest.fn()
    
    render(
      <PillTabSwitcher
        tabs={mockTabs}
        activeTab="login"
        onTabChange={mockOnTabChange}
      />
    )

    const registerTab = screen.getByRole('button', { name: 'Register' })
    
    // Test that focus event can be triggered without error
    expect(() => {
      fireEvent.focus(registerTab)
      fireEvent.blur(registerTab)
    }).not.toThrow()
    
    // Verify the tab is focusable
    expect(registerTab).not.toHaveAttribute('tabindex', '-1')
  })

  it('should maintain accessibility with focus indicators', () => {
    const mockOnTabChange = jest.fn()
    
    render(
      <PillTabSwitcher
        tabs={mockTabs}
        activeTab="login"
        onTabChange={mockOnTabChange}
      />
    )

    const tabs = screen.getAllByRole('button')
    
    tabs.forEach(tab => {
      // Check that focus-visible classes are present for accessibility
      expect(tab).toHaveClass('focus-visible:outline-none')
      expect(tab).toHaveClass('focus-visible:ring-offset-2')
      expect(tab).toHaveClass('focus-visible:ring-offset-background')
    })
  })
})