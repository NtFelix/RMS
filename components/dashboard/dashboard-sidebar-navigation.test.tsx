import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock the UserSettings component
jest.mock('@/components/common/user-settings', () => ({
  UserSettings: () => <div data-testid="user-settings">User Settings</div>,
}))

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('DashboardSidebar Navigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders all navigation items including Cloud Storage', () => {
    render(<DashboardSidebar />)

    // Check that all navigation items are present
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Finanzen')).toBeInTheDocument()
    expect(screen.getByText('Betriebskosten')).toBeInTheDocument()
    expect(screen.getByText('Aufgaben')).toBeInTheDocument()
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
  })

  it('renders Cloud Storage navigation item with correct href', () => {
    render(<DashboardSidebar />)

    const cloudStorageLink = screen.getByRole('link', { name: /cloud storage/i })
    expect(cloudStorageLink).toBeInTheDocument()
    expect(cloudStorageLink).toHaveAttribute('href', '/dateien')
  })

  it('applies active styling to current route', () => {
    mockUsePathname.mockReturnValue('/dateien')
    render(<DashboardSidebar />)

    const cloudStorageLink = screen.getByRole('link', { name: /cloud storage/i })
    expect(cloudStorageLink).toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('applies inactive styling to non-current routes', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<DashboardSidebar />)

    const cloudStorageLink = screen.getByRole('link', { name: /cloud storage/i })
    expect(cloudStorageLink).toHaveClass('text-muted-foreground')
    expect(cloudStorageLink).not.toHaveClass('bg-accent', 'text-accent-foreground')
  })

  it('renders navigation items in correct order', () => {
    render(<DashboardSidebar />)

    const navLinks = screen.getAllByRole('link')
    const navTexts = navLinks.map(link => link.textContent)

    // Filter out the logo link and get only navigation items
    const navigationTexts = navTexts.filter(text =>
      text && !text.includes('Property Manager')
    )

    expect(navigationTexts).toEqual([
      'Dashboard',
      'Häuser',
      'Wohnungen',
      'Mieter',
      'Finanzen',
      'Betriebskosten',
      'Aufgaben',
      'Cloud Storage'
    ])
  })

  it('renders with proper accessibility attributes', () => {
    render(<DashboardSidebar />)

    const cloudStorageLink = screen.getByRole('link', { name: /cloud storage/i })
    expect(cloudStorageLink).toBeInTheDocument()

    // Check that the link is properly accessible
    expect(cloudStorageLink).toHaveAttribute('href', '/dateien')
  })
})