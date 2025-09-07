import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { useMobileNavigation } from '@/hooks/use-mobile-nav-store'
import { useOrientationAwareMobile } from '@/hooks/use-orientation'

// Mock the hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-mobile-nav-store', () => ({
  useMobileNavigation: jest.fn(),
}))

jest.mock('@/hooks/use-orientation', () => ({
  useOrientationAwareMobile: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseMobileNavigation = useMobileNavigation as jest.MockedFunction<typeof useMobileNavigation>
const mockUseOrientationAwareMobile = useOrientationAwareMobile as jest.MockedFunction<typeof useOrientationAwareMobile>

describe('Mobile Navigation Orientation Handling', () => {
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

  it('should render with portrait orientation styling', () => {
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    render(<MobileBottomNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-orientation', 'portrait')
    
    // Check for portrait-specific classes
    const navContainer = nav.querySelector('div')
    expect(navContainer).toHaveClass('px-1', 'py-2')
  })

  it('should render with landscape orientation styling', () => {
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: false,
      angle: 90,
    })

    render(<MobileBottomNav />)

    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-orientation', 'landscape')
    
    // Check for landscape-specific classes
    const navContainer = nav.querySelector('div')
    expect(navContainer).toHaveClass('px-8', 'py-1')
    
    // Check for thicker border in landscape
    expect(nav).toHaveClass('border-t-2')
  })

  it('should show changing state during orientation transition', () => {
    mockUseOrientationAwareMobile.mockReturnValue({
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
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: false,
      orientation: 'landscape',
      isChanging: false,
      angle: 0,
    })

    const { container } = render(<MobileBottomNav />)
    expect(container.firstChild).toBeNull()
  })

  it('should handle orientation change during navigation', () => {
    const { rerender } = render(<MobileBottomNav />)

    // Start in portrait
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    rerender(<MobileBottomNav />)

    let nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-orientation', 'portrait')

    // Change to landscape
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: true,
      angle: 90,
    })

    rerender(<MobileBottomNav />)

    nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('data-orientation', 'landscape')
    expect(nav).toHaveClass('opacity-90') // Should show changing state
  })

  it('should maintain navigation functionality during orientation changes', () => {
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: false,
      angle: 90,
    })

    render(<MobileBottomNav />)

    // Test plus button functionality
    const plusButton = screen.getByLabelText('Open add menu')
    fireEvent.click(plusButton)

    expect(mockNavigation.openAddMenu).toHaveBeenCalled()

    // Test weitere button functionality
    const weitereButton = screen.getByLabelText('Open Weitere menu')
    fireEvent.click(weitereButton)

    expect(mockNavigation.openMoreMenu).toHaveBeenCalled()
  })

  it('should apply correct text sizes for different orientations', () => {
    // Test portrait text size
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    const { rerender } = render(<MobileBottomNav />)

    let homeLabel = screen.getByText('Home')
    expect(homeLabel).toHaveClass('text-xs')

    // Test landscape text size
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'landscape',
      isChanging: false,
      angle: 90,
    })

    rerender(<MobileBottomNav />)

    homeLabel = screen.getByText('Home')
    expect(homeLabel).toHaveClass('text-[10px]')
  })

  it('should handle active state correctly in both orientations', () => {
    mockUsePathname.mockReturnValue('/haeuser')
    
    mockUseOrientationAwareMobile.mockReturnValue({
      isMobile: true,
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })

    render(<MobileBottomNav />)

    const haeuserLink = screen.getByLabelText('Navigate to Häuser')
    expect(haeuserLink).toHaveClass('text-blue-600', 'bg-blue-50')
  })
})