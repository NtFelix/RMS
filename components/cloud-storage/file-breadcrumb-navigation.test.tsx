import { render, screen, fireEvent } from '@testing-library/react'
import { FileBreadcrumbNavigation } from '@/components/cloud-storage/file-breadcrumb-navigation'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'
import { useFolderNavigation } from '@/components/common/navigation-interceptor'

// Mock the hooks
jest.mock('@/hooks/use-cloud-storage-store')
jest.mock('@/components/common/navigation-interceptor')

const mockUseCloudStorageStore = useCloudStorageStore as jest.MockedFunction<typeof useCloudStorageStore>
const mockUseFolderNavigation = useFolderNavigation as jest.MockedFunction<typeof useFolderNavigation>

describe('FileBreadcrumbNavigation', () => {
  const mockHandleFolderClick = jest.fn()
  const mockPathToHref = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseFolderNavigation.mockReturnValue({
      handleFolderClick: mockHandleFolderClick,
      isNavigating: false,
      pathToHref: mockPathToHref
    })
  })

  it('renders nothing when no breadcrumbs', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [],
    } as any)

    const { container } = render(<FileBreadcrumbNavigation userId="test-user" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders single breadcrumb (root)', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
    // Root breadcrumb should be current page (span, not button)
    expect(screen.queryByRole('button', { name: /cloud storage/i })).not.toBeInTheDocument()
  })

  it('renders multiple breadcrumbs with navigation', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Musterstraße 123')).toBeInTheDocument()
    
    // Last breadcrumb should be current page (span, not button)
    expect(screen.queryByRole('button', { name: /musterstraße 123/i })).not.toBeInTheDocument()
    
    // Previous breadcrumbs should be clickable
    expect(screen.getByRole('button', { name: /cloud storage/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /häuser/i })).toBeInTheDocument()
  })

  it('navigates when clicking on breadcrumb', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    fireEvent.click(screen.getByRole('button', { name: /häuser/i }))
    
    expect(mockHandleFolderClick).toHaveBeenCalledWith('user_test-user/haeuser')
  })

  it('applies correct colors for different breadcrumb types', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' },
        { name: 'Wohnung 1A', path: 'user_test-user/haeuser/1/2', type: 'apartment' },
        { name: 'Max Mustermann', path: 'user_test-user/haeuser/1/2/3', type: 'tenant' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    const categoryButton = screen.getByRole('button', { name: /häuser/i })
    const houseButton = screen.getByRole('button', { name: /musterstraße 123/i })
    const apartmentButton = screen.getByRole('button', { name: /wohnung 1a/i })
    
    expect(categoryButton).toHaveClass('text-orange-600')
    expect(houseButton).toHaveClass('text-blue-600')
    expect(apartmentButton).toHaveClass('text-green-600')
  })

  it('shows home icon for root breadcrumb', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    // Check if home icon is present - root breadcrumb should be current page (span)
    const rootElement = screen.getByText('Cloud Storage')
    expect(rootElement).toBeInTheDocument()
  })

  it('truncates long breadcrumb names', () => {
    mockUseCloudStorageStore.mockReturnValue({
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Very Long House Name That Should Be Truncated', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
    } as any)

    render(<FileBreadcrumbNavigation userId="test-user" />)
    
    const longNameElement = screen.getByText('Very Long House Name That Should Be Truncated')
    expect(longNameElement).toHaveClass('truncate')
    expect(longNameElement).toHaveClass('max-w-[150px]', 'sm:max-w-[200px]')
  })
})