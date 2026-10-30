import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar'
import { SidebarUserData } from '@/lib/server/user-data'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock the UserSettings component
jest.mock('@/components/common/user-settings', () => ({
  UserSettings: () => <div data-testid="user-settings">User Settings</div>,
}))

// Mock PostHog feature flags to enable all features
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn().mockReturnValue(true),
}))

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  })),
}))

const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

const mockSidebarData: SidebarUserData = {
  user: null,
  userName: 'Test User',
  userEmail: 'test@example.com',
  userInitials: 'TU',
  apartmentCount: 5,
  apartmentLimit: 10,
  hasOrganisationPermission: true,
  isOrganisationHidden: false,
  modulePermissions: null,
}

describe('DashboardSidebar Navigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders primary navigation links on desktop', () => {
    const { container } = render(<DashboardSidebar sidebarData={mockSidebarData} />)

    // Verify all primary route links exist in the desktop navigation strip
    const hrefs = ['/dashboard', '/haeuser', '/wohnungen', '/mieter', '/finanzen', '/betriebskosten', '/todos', '/dateien', '/mails']
    hrefs.forEach(href => {
      const link = container.querySelector(`a[href="${href}"]`)
      expect(link).toBeInTheDocument()
    })
  })

  it('renders Cloud Storage navigation item with correct href', () => {
    const { container } = render(<DashboardSidebar sidebarData={mockSidebarData} />)

    const cloudStorageLink = container.querySelector('a[href="/dateien"]')
    expect(cloudStorageLink).toBeInTheDocument()
  })

  it('applies active styling to current route', () => {
    mockUsePathname.mockReturnValue('/dateien')
    const { container } = render(<DashboardSidebar sidebarData={mockSidebarData} />)

    const cloudStorageLink = container.querySelector('a[href="/dateien"]')
    expect(cloudStorageLink).toHaveClass('bg-accent')
  })

  it('applies inactive styling to non-current routes', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    const { container } = render(<DashboardSidebar sidebarData={mockSidebarData} />)

    const cloudStorageLink = container.querySelector('a[href="/dateien"]')
    expect(cloudStorageLink).toHaveClass('text-muted-foreground')
    expect(cloudStorageLink).not.toHaveClass('bg-accent')
  })

  it('switches the active entry in one render and does not fade colours on an active-state change', () => {
    mockUsePathname.mockReturnValue('/mieter')
    const { container, rerender } = render(<DashboardSidebar sidebarData={mockSidebarData} />)
    const mieter = container.querySelector('a[href="/mieter"]') as HTMLElement
    const haeuser = container.querySelector('a[href="/haeuser"]') as HTMLElement
    expect(mieter).toHaveAttribute('data-active', 'true')

    mockUsePathname.mockReturnValue('/haeuser')
    rerender(<DashboardSidebar sidebarData={mockSidebarData} />)

    expect(mieter).toHaveAttribute('data-active', 'false')
    expect(haeuser).toHaveAttribute('data-active', 'true')
    // A plain `transition-colors` would fade the old entry out and the new one in for 200ms; only the hover of an
    // inactive entry is animated.
    expect(haeuser).not.toHaveClass('transition-colors')
    expect(mieter).not.toHaveClass('transition-colors')
    expect(mieter).toHaveClass('data-[active=false]:hover:transition-colors')
  })

  it('renders primary navigation items in correct order', () => {
    const { container } = render(<DashboardSidebar sidebarData={mockSidebarData} />)

    // Query links in the primary left column's nav
    const navElement = container.querySelector('nav')
    expect(navElement).toBeInTheDocument()
    const links = navElement!.querySelectorAll('a')
    const hrefs = Array.from(links).map(link => link.getAttribute('href'))

    expect(hrefs).toEqual([
      '/dashboard',
      '/suche',
      '/organisation',
      '/haeuser',
      '/wohnungen',
      '/mieter',
      '/finanzen',
      '/betriebskosten',
      '/todos',
      '/dateien',
      '/mails',
      '/agenten'
    ])
  })
})