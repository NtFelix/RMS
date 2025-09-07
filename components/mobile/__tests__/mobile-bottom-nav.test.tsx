import React from 'react'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { MobileBottomNav } from '../mobile-bottom-nav'
import { useIsMobile } from '@/hooks/use-mobile'

// Mock the hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-mobile', () => ({
  useIsMobile: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/home')
    mockUseIsMobile.mockReturnValue(true)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders navigation items when on mobile', () => {
    render(<MobileBottomNav currentPath="/home" />)
    
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Weitere')).toBeInTheDocument()
  })

  it('does not render when on desktop', () => {
    mockUseIsMobile.mockReturnValue(false)
    
    const { container } = render(<MobileBottomNav currentPath="/home" />)
    
    expect(container.firstChild).toBeNull()
  })

  it('shows active state for current path', () => {
    mockUsePathname.mockReturnValue('/home')
    
    render(<MobileBottomNav currentPath="/home" />)
    
    const homeLink = screen.getByRole('button', { name: /navigate to home/i })
    expect(homeLink).toHaveClass('text-blue-600', 'bg-blue-50')
  })

  it('has proper touch targets (minimum 44px)', () => {
    render(<MobileBottomNav currentPath="/home" />)
    
    const buttons = screen.getAllByRole('button')
    buttons.forEach(button => {
      expect(button).toHaveClass('min-w-[44px]', 'min-h-[44px]')
    })
  })

  it('styles plus button with primary color', () => {
    render(<MobileBottomNav currentPath="/home" />)
    
    const plusButton = screen.getByRole('button', { name: /open add menu/i })
    expect(plusButton).toHaveClass('bg-blue-600', 'text-white')
  })
})