import React from 'react'
import { render, screen } from '@testing-library/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useIsMobile } from '@/hooks/use-mobile'
import { useCommandMenu } from '@/hooks/use-command-menu'

// Mock the hooks
jest.mock('@/hooks/use-mobile')
jest.mock('@/hooks/use-command-menu')
jest.mock('@/components/dashboard-sidebar', () => ({
  DashboardSidebar: () => <div data-testid="desktop-sidebar">Desktop Sidebar</div>
}))
jest.mock('@/components/mobile', () => ({
  MobileBottomNav: () => <div data-testid="mobile-nav">Mobile Navigation</div>
}))

const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>
const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>

describe('DashboardLayout Mobile Responsiveness', () => {
  beforeEach(() => {
    mockUseCommandMenu.mockReturnValue({
      setOpen: jest.fn(),
      open: false
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render desktop layout when not on mobile', () => {
    mockUseIsMobile.mockReturnValue(false)

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Desktop elements should be visible
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument()
    expect(screen.getByText('Suchen...')).toBeInTheDocument()
    
    // Mobile navigation should not be present
    expect(screen.queryByTestId('mobile-nav')).not.toBeInTheDocument()
  })

  it('should render mobile layout when on mobile', () => {
    mockUseIsMobile.mockReturnValue(true)

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    // Mobile navigation should be visible
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
    
    // Desktop elements should not be present
    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument()
    expect(screen.queryByText('Suchen...')).not.toBeInTheDocument()
  })

  it('should apply correct padding for mobile content', () => {
    mockUseIsMobile.mockReturnValue(true)

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const mainElement = screen.getByRole('main')
    expect(mainElement).toHaveClass('p-4', 'pb-20')
  })

  it('should apply correct padding for desktop content', () => {
    mockUseIsMobile.mockReturnValue(false)

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    )

    const mainElement = screen.getByRole('main')
    expect(mainElement).toHaveClass('p-6')
    expect(mainElement).not.toHaveClass('p-4', 'pb-20')
  })

  it('should render children content in both layouts', () => {
    const testContent = 'Test Content for Layout'
    
    // Test mobile layout
    mockUseIsMobile.mockReturnValue(true)
    const { rerender } = render(
      <DashboardLayout>
        <div>{testContent}</div>
      </DashboardLayout>
    )
    expect(screen.getByText(testContent)).toBeInTheDocument()

    // Test desktop layout
    mockUseIsMobile.mockReturnValue(false)
    rerender(
      <DashboardLayout>
        <div>{testContent}</div>
      </DashboardLayout>
    )
    expect(screen.getByText(testContent)).toBeInTheDocument()
  })
})