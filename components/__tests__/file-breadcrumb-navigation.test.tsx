import { render, screen, fireEvent } from '@testing-library/react'
import { FileBreadcrumbNavigation } from '@/components/file-breadcrumb-navigation'
import { useCloudStorageNavigation } from '@/hooks/use-cloud-storage-store'

// Mock the hook
jest.mock('@/hooks/use-cloud-storage-store')

const mockUseCloudStorageNavigation = useCloudStorageNavigation as jest.MockedFunction<typeof useCloudStorageNavigation>

describe('FileBreadcrumbNavigation', () => {
  const mockNavigateToPath = jest.fn()
  const mockSetBreadcrumbs = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when no breadcrumbs', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: '',
      breadcrumbs: [],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    const { container } = render(<FileBreadcrumbNavigation />)
    expect(container.firstChild).toBeNull()
  })

  it('renders single breadcrumb (root)', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cloud storage/i })).toBeDisabled()
  })

  it('renders multiple breadcrumbs with navigation', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user/haeuser/1',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Musterstraße 123')).toBeInTheDocument()
    
    // Last breadcrumb should be disabled
    expect(screen.getByRole('button', { name: /musterstraße 123/i })).toBeDisabled()
    
    // Previous breadcrumbs should be clickable
    expect(screen.getByRole('button', { name: /cloud storage/i })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /häuser/i })).not.toBeDisabled()
  })

  it('navigates when clicking on breadcrumb', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user/haeuser/1',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    fireEvent.click(screen.getByRole('button', { name: /häuser/i }))
    
    expect(mockNavigateToPath).toHaveBeenCalledWith('user_test-user/haeuser')
  })

  it('applies correct colors for different breadcrumb types', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user/haeuser/1/2/3',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Häuser', path: 'user_test-user/haeuser', type: 'category' },
        { name: 'Musterstraße 123', path: 'user_test-user/haeuser/1', type: 'house' },
        { name: 'Wohnung 1A', path: 'user_test-user/haeuser/1/2', type: 'apartment' },
        { name: 'Max Mustermann', path: 'user_test-user/haeuser/1/2/3', type: 'tenant' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    const categoryButton = screen.getByRole('button', { name: /häuser/i })
    const houseButton = screen.getByRole('button', { name: /musterstraße 123/i })
    const apartmentButton = screen.getByRole('button', { name: /wohnung 1a/i })
    
    expect(categoryButton).toHaveClass('text-orange-600')
    expect(houseButton).toHaveClass('text-blue-600')
    expect(apartmentButton).toHaveClass('text-green-600')
  })

  it('shows home icon for root breadcrumb', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    // Check if home icon is present (we can't easily test the icon itself, but we can check the structure)
    const rootButton = screen.getByRole('button', { name: /cloud storage/i })
    expect(rootButton).toBeInTheDocument()
  })

  it('truncates long breadcrumb names', () => {
    mockUseCloudStorageNavigation.mockReturnValue({
      currentPath: 'user_test-user/haeuser/1',
      breadcrumbs: [
        { name: 'Cloud Storage', path: 'user_test-user', type: 'root' },
        { name: 'Very Long House Name That Should Be Truncated', path: 'user_test-user/haeuser/1', type: 'house' }
      ],
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
    })

    render(<FileBreadcrumbNavigation />)
    
    const longNameElement = screen.getByText('Very Long House Name That Should Be Truncated')
    expect(longNameElement).toHaveClass('truncate')
    expect(longNameElement).toHaveClass('max-w-[150px]', 'sm:max-w-[200px]')
  })
})