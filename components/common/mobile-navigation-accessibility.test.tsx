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

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard'
}))

describe('MobileBottomNavigation Accessibility', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
  })

  it('has proper navigation role and aria-label', () => {
    render(<MobileBottomNavigation />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Main mobile navigation')
  })

  it('has proper ARIA labels for navigation items', () => {
    render(<MobileBottomNavigation />)

    // Check primary navigation items
    expect(screen.getByLabelText(/Navigate to Home/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Navigate to Mieter/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Suchen - Open search/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Navigate to Finanzen/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mehr menu/)).toBeInTheDocument()
  })

  it('has proper focus management and keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<MobileBottomNavigation />)

    // Find and click the More button
    const moreButton = screen.getByLabelText(/Mehr menu/)
    await user.click(moreButton)

    // Wait for dropdown to appear
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    // Check dropdown has proper ARIA attributes
    const dropdown = screen.getByRole('menu')
    expect(dropdown).toHaveAttribute('aria-label', 'More navigation options')
    expect(dropdown).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('supports keyboard navigation in dropdown', async () => {
    const user = userEvent.setup()
    render(<MobileBottomNavigation />)

    // Open dropdown
    const moreButton = screen.getByLabelText(/Mehr menu/)
    await user.click(moreButton)

    // Wait for dropdown
    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    // Test Escape key closes dropdown
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('has screen reader announcements', () => {
    render(<MobileBottomNavigation />)

    // Check for screen reader announcement region
    const announcement = screen.getByRole('status')
    expect(announcement).toHaveAttribute('aria-live', 'polite')
    expect(announcement).toHaveAttribute('aria-atomic', 'true')
    expect(announcement).toHaveClass('sr-only')
  })

  it('has proper button descriptions', () => {
    render(<MobileBottomNavigation />)

    // Check for More button description
    const description = screen.getByText(/Opens additional navigation options/)
    expect(description).toHaveClass('sr-only')
    expect(description).toHaveAttribute('id', 'more-button-description')
  })

  it('has proper aria-expanded state for More button', async () => {
    const user = userEvent.setup()
    render(<MobileBottomNavigation />)

    const moreButton = screen.getByLabelText(/Mehr menu/)

    // Initially collapsed
    expect(moreButton).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    await user.click(moreButton)

    await waitFor(() => {
      expect(moreButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('has proper focus indicators', () => {
    render(<MobileBottomNavigation />)

    // All interactive elements should have focus styles
    const buttons = screen.getAllByRole('button')
    const links = screen.getAllByRole('link')

    buttons.forEach(button => {
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-accent')
    })

    links.forEach(link => {
      expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-accent')
    })
  })

  it('has minimum touch target sizes', () => {
    render(<MobileBottomNavigation />)

    // All interactive elements should have minimum 44px touch targets
    const buttons = screen.getAllByRole('button')
    const links = screen.getAllByRole('link')

    buttons.forEach(button => {
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })

    links.forEach(link => {
      expect(link).toHaveClass('min-h-[44px]', 'min-w-[44px]')
    })
  })

  it('has proper aria-current for active states', () => {
    // Test that inactive items don't have aria-current
    render(<MobileBottomNavigation />)

    const homeLink = screen.getByLabelText('Navigate to Home')
    expect(homeLink).not.toHaveAttribute('aria-current')

    // Test that the component structure supports aria-current
    // (The actual active state would be tested in integration tests)
    expect(homeLink).toBeInTheDocument()
  })
})