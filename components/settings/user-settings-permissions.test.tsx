import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserSettings, OrganisationItem } from '@/components/common/user-settings'
import { useApartmentUsage } from '@/hooks/use-apartment-usage'
import { User } from '@supabase/supabase-js'
import { SidebarUserData } from '@/lib/server/user-data'

// Mock dependencies
jest.mock('@/hooks/use-apartment-usage')
jest.mock('@/hooks/use-user-profile', () => ({
  useUserProfile: jest.fn(() => ({
    user: null,
    userName: 'Test User',
    userEmail: 'test@example.com',
    userInitials: 'TU',
    isLoading: false,
    error: null,
  })),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn(() => ({
    openTemplatesModal: jest.fn(),
    openTrashBinModal: jest.fn(),
  })),
}))
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: () => false,
}))
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(() => Promise.resolve({ error: null })),
    },
  })),
}))
jest.mock('@/components/ui/custom-dropdown', () => ({
  CustomDropdown: ({ children, trigger }: { children: React.ReactNode; trigger: React.ReactNode }) => (
    <div>
      {trigger}
      <div data-testid="dropdown-content">{children}</div>
    </div>
  ),
  CustomDropdownItem: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick} {...props}>{children}</div>
  ),
  CustomDropdownLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CustomDropdownSeparator: () => <hr />,
}))

describe('UserSettings Organisation Permissions (isOrgAdminOrOwner)', () => {
  const mockUseApartmentUsage = useApartmentUsage as jest.MockedFunction<typeof useApartmentUsage>
  
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  } as unknown as User

  const mockSidebarData: SidebarUserData = {
    user: mockUser,
    userName: 'Test User',
    userEmail: 'test@example.com',
    userInitials: 'TU',
    apartmentCount: 0,
    apartmentLimit: null,
    hasOrganisationPermission: true,
    isOrganisationHidden: false,
    modulePermissions: null,
    checklist: { hasHouse: false, hasApartment: false, hasMeter: false, hasTenant: false, hasBill: false },
  }

  const sampleOrgs: OrganisationItem[] = [
    {
      organisation_id: 'org-owner',
      owner_id: 'user-1',
      rolle: 'owner',
      name: 'Owner Org',
    },
    {
      organisation_id: 'org-admin',
      owner_id: 'user-2',
      rolle: 'admin',
      name: 'Admin Org',
    },
    {
      organisation_id: 'org-employee',
      owner_id: 'user-3',
      rolle: 'mitarbeiter',
      name: 'Employee Org',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseApartmentUsage.mockReturnValue({
      count: 0,
      limit: null,
      isLoading: false,
      error: null,
      progressPercentage: 0,
    })
  })

  it('allows admin actions in personal context (currentOrgId === null)', async () => {
    render(
      <UserSettings 
        initialData={mockSidebarData}
        organisations={sampleOrgs}
        currentOrgId={null}
      />
    )

    // Open user settings dropdown
    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Papierkorb')).toBeInTheDocument()
    })
  })

  it('allows admin actions in owner organisation context', async () => {
    render(
      <UserSettings 
        initialData={mockSidebarData}
        organisations={sampleOrgs}
        currentOrgId="org-owner"
      />
    )

    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Papierkorb')).toBeInTheDocument()
    })
  })

  it('allows admin actions in admin organisation context', async () => {
    render(
      <UserSettings 
        initialData={mockSidebarData}
        organisations={sampleOrgs}
        currentOrgId="org-admin"
      />
    )

    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Papierkorb')).toBeInTheDocument()
    })
  })

  it('hides admin actions in employee organisation context (rolle === mitarbeiter)', async () => {
    render(
      <UserSettings 
        initialData={mockSidebarData}
        organisations={sampleOrgs}
        currentOrgId="org-employee"
      />
    )

    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.queryByText('Papierkorb')).not.toBeInTheDocument()
    })
  })

  it('fails closed (hides admin actions) when organisation data is loaded but currentOrgId is unknown', async () => {
    render(
      <UserSettings 
        initialData={mockSidebarData}
        organisations={sampleOrgs}
        currentOrgId="org-unknown"
      />
    )

    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.queryByText('Papierkorb')).not.toBeInTheDocument()
    })
  })

  it('falls back to initialData.hasOrganisationPermission while organisations array is empty/loading', async () => {
    render(
      <UserSettings 
        initialData={{ ...mockSidebarData, hasOrganisationPermission: true }}
        organisations={[]}
        currentOrgId="org-loading"
      />
    )

    const trigger = screen.getByLabelText('User menu')
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Papierkorb')).toBeInTheDocument()
    })
  })
})
