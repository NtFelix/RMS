import { fireEvent, render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { PrimaryRail } from './primary-rail'
import { SidebarUserData } from '@/lib/server/user-data'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/components/common/user-settings', () => ({
  UserSettings: () => <div data-testid="user-settings">User Settings</div>,
}))

jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn().mockReturnValue(true),
}))

jest.mock('@/app/organisation-actions', () => ({
  getMyOrganisationsAction: jest.fn(() => Promise.resolve({ success: true, data: [], currentOrgId: null })),
  switchOrganisationAction: jest.fn(),
}))

const mockSetCommandMenuOpen = jest.fn()
jest.mock('@/hooks/use-command-menu', () => ({
  useCommandMenu: () => ({ setOpen: mockSetCommandMenuOpen }),
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

const sidebarData: SidebarUserData = {
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

describe('PrimaryRail', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
    sessionStorage.clear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the navigation entries in the order of the groups, separated by group', () => {
    const { container } = render(<PrimaryRail sidebarData={sidebarData} />)

    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/dashboard', '/suche', '/organisation',
      '/haeuser', '/wohnungen', '/mieter', '/kontakte',
      '/finanzen', '/betriebskosten',
      '/todos', '/dateien', '/mails', '/agenten',
    ])
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual([
      'Allgemein', 'Objekte', 'Finanzen', 'Tools',
    ])
    expect(screen.getAllByRole('separator')).toHaveLength(3)
  })

  it('keeps the ids the onboarding tour looks for', () => {
    const { container } = render(<PrimaryRail sidebarData={sidebarData} />)

    expect(container.querySelector('#sidebar-nav-dashboard')).toHaveAttribute('href', '/dashboard')
    expect(container.querySelector('#sidebar-nav-haeuser')).toHaveAttribute('href', '/haeuser')
    expect(container.querySelector('#sidebar-nav-wohnungen')).toHaveAttribute('href', '/wohnungen')
  })

  it('marks only the current route as active, with the primary pill', () => {
    mockUsePathname.mockReturnValue('/haeuser')
    const { container } = render(<PrimaryRail sidebarData={sidebarData} />)
    const haeuser = container.querySelector('a[href="/haeuser"]') as HTMLElement
    const mieter = container.querySelector('a[href="/mieter"]') as HTMLElement

    expect(haeuser).toHaveAttribute('aria-current', 'page')
    expect(haeuser).toHaveAttribute('data-active', 'true')
    expect(haeuser).toHaveClass('bg-primary/10', 'text-primary')
    expect(mieter).not.toHaveAttribute('aria-current')
    expect(mieter).toHaveAttribute('data-active', 'false')
    expect(mieter).not.toHaveClass('bg-primary/10')
  })

  it('also highlights an entry for its sub routes', () => {
    mockUsePathname.mockReturnValue('/haeuser/abc')
    const { container } = render(<PrimaryRail sidebarData={sidebarData} />)

    expect(container.querySelector('a[href="/haeuser"]')).toHaveAttribute('aria-current', 'page')
  })

  it('hides entries without module permission and empty groups', () => {
    const { container } = render(
      <PrimaryRail
        sidebarData={{ ...sidebarData, isOrganisationHidden: true, modulePermissions: new Set(['haeuser']) }}
      />,
    )

    const hrefs = Array.from(container.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))
    // E-Mails has no module and stays; Finanzen has none of its entries left and is dropped
    expect(hrefs).toEqual(['/dashboard', '/suche', '/haeuser', '/mails'])
    expect(screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(['Allgemein', 'Objekte', 'Tools'])
  })

  it('opens the command menu instead of navigating for "Suche"', () => {
    const { container } = render(<PrimaryRail sidebarData={sidebarData} />)

    fireEvent.click(container.querySelector('a[href="/suche"]') as HTMLElement)

    expect(mockSetCommandMenuOpen).toHaveBeenCalledWith(true)
  })

  it('offers the organisation switcher and the user menu', () => {
    render(<PrimaryRail sidebarData={sidebarData} />)

    expect(screen.getByRole('button', { name: 'Organisation menu' })).toHaveAttribute('data-org-switcher-trigger')
    expect(screen.getByTestId('user-settings')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Benachrichtigungen öffnen' })).toBeInTheDocument()
  })
})
