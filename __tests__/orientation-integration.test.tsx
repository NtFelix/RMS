import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'

// Mock the hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-mobile-nav-store', () => ({
  useMobileNavigation: jest.fn(),
}))

// Mock the orientation hook to return controlled values
jest.mock('@/hooks/use-orientation', () => ({
  useOrientationAwareMobile: jest.fn(),
  useOrientation: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseMobileNavigation = useMobileNavigation as jest.MockedFunction<typeof useMobileNavigation>

// Import the mocked hook
const { useOrientationAwareMobile } = require('@/hooks/use-orientation')

describe('Orientation Integration Tests', () => {
  const mockNavigation = {
    isAddMenuOpen: false,
    isMoreMenuOpen: false,
    openAddMenu: jest.fn(),
    openMoreMenu: jest.fn(),
    closeAddMenu: jest.fn(),
    closeMoreMenu: jest.fn(),
    closeAllDropdowns: jest.fn(),
    activeDropdown: 'none' as const,
    setActiveDropdown: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/home')
    mockUseMobileNavigation.mockReturnValue(mockNavigation)
  })

  it('should render mobile navigation with portrait orientation', () => {
    useOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    render(<MobileBottomNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveAttribute('data-orientation', 'portrait')
  })

  it('should render mobile navigation with landscape orientation', () => {
    useOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: false,
      angle: 90,
    })

    render(<MobileBottomNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveAttribute('data-orientation', 'landscape')
    
    // Should have landscape-specific styling
    expect(nav).toHaveClass('border-t-2')
  })

  it('should show changing state during orientation transition', () => {
    useOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: true,
      angle: 0,
    })

    render(<MobileBottomNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('opacity-90')
  })

  it('should not render on desktop', () => {
    useOrientationAwareMobile.mockReturnValue({
      isMobile: false,
      orientation: 'landscape',
      isChanging: false,
      angle: 0,
    })

    const { container } = render(<MobileBottomNav />)
    expect(container.firstChild).toBeNull()
  })

  it('should maintain all navigation items in both orientations', () => {
    // Test portrait
    useOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    const { rerender } = render(<MobileBottomNav />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Weitere')).toBeInTheDocument()

    // Test landscape
    useOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: false,
      angle: 90,
    })

    rerender(<MobileBottomNav />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Weitere')).toBeInTheDocument()
  })
})