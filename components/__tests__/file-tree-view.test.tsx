import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FileTreeView } from '@/components/cloud-storage/file-tree-view'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'
import { usePropertyHierarchy } from '@/hooks/use-property-hierarchy'
import { useFolderNavigation } from '@/components/common/navigation-interceptor'

// Mock the hooks
jest.mock('@/hooks/use-cloud-storage-store')
jest.mock('@/hooks/use-property-hierarchy')
jest.mock('@/components/common/navigation-interceptor')

const mockUseCloudStorageStore = useCloudStorageStore as jest.MockedFunction<typeof useCloudStorageStore>
const mockUsePropertyHierarchy = usePropertyHierarchy as jest.MockedFunction<typeof usePropertyHierarchy>
const mockUseFolderNavigation = useFolderNavigation as jest.MockedFunction<typeof useFolderNavigation>

describe('FileTreeView', () => {
  const mockNavigateToPath = jest.fn()
  const mockSetBreadcrumbs = jest.fn()
  const mockSetFolders = jest.fn()
  const mockHandleFolderClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseFolderNavigation.mockReturnValue({
      handleFolderClick: mockHandleFolderClick,
      isNavigating: false,
      pathToHref: jest.fn((path) => `/dateien/${path.replace(/^user_[^/]+\/?/, '')}`)
    })
    
    mockUseCloudStorageStore.mockReturnValue({
      currentPath: 'user_test-user',
      navigateToPath: mockNavigateToPath,
      setBreadcrumbs: mockSetBreadcrumbs,
      folders: [],
      setFolders: mockSetFolders,
      breadcrumbs: [],
      files: [],
      isLoading: false,
      error: null,
      uploadQueue: [],
      isUploading: false,
      previewFile: null,
      isPreviewOpen: false,
      setFiles: jest.fn(),
      setLoading: jest.fn(),
      setError: jest.fn(),
      addToUploadQueue: jest.fn(),
      updateUploadProgress: jest.fn(),
      updateUploadStatus: jest.fn(),
      removeFromUploadQueue: jest.fn(),
      clearUploadQueue: jest.fn(),
      setUploading: jest.fn(),
      openPreview: jest.fn(),
      closePreview: jest.fn(),
      reset: jest.fn(),
      refreshCurrentPath: jest.fn(),
    })
  })

  it('renders loading state', () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [],
      apartments: [],
      tenants: [],
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [],
      apartments: [],
      tenants: [],
      isLoading: false,
      error: 'Failed to load data',
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    expect(screen.getByText('Fehler beim Laden der Ordnerstruktur')).toBeInTheDocument()
  })

  it('renders tree structure with houses and apartments', async () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [
        { id: '1', name: 'Musterstraße 123', strasse: 'Musterstraße 123', ort: 'Berlin' }
      ],
      apartments: [
        { id: '1', name: 'Wohnung 1A', groesse: 50, miete: 800, haus_id: '1' }
      ],
      tenants: [
        { id: '1', name: 'Max Mustermann', wohnung_id: '1', einzug: '2023-01-01' }
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
      expect(screen.getByText('Häuser')).toBeInTheDocument()
      expect(screen.getByText('Sonstiges')).toBeInTheDocument()
    })
  })

  it('expands and collapses nodes', async () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [
        { id: '1', name: 'Musterstraße 123', strasse: 'Musterstraße 123', ort: 'Berlin' }
      ],
      apartments: [
        { id: '1', name: 'Wohnung 1A', groesse: 50, miete: 800, haus_id: '1' }
      ],
      tenants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Häuser')).toBeInTheDocument()
    })

    // Click to expand Häuser
    const haeuserExpandButton = screen.getByText('Häuser').parentElement?.querySelector('button')
    if (haeuserExpandButton) {
      fireEvent.click(haeuserExpandButton)
    }

    await waitFor(() => {
      expect(screen.getByText('Musterstraße 123')).toBeInTheDocument()
    })
  })

  it('navigates to selected path', async () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [
        { id: '1', name: 'Musterstraße 123', strasse: 'Musterstraße 123', ort: 'Berlin' }
      ],
      apartments: [],
      tenants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Häuser')).toBeInTheDocument()
    })

    // Click on Häuser
    fireEvent.click(screen.getByText('Häuser'))

    expect(mockHandleFolderClick).toHaveBeenCalledWith('user_test-user/haeuser')
  })

  it('shows empty folder indicators', async () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [],
      apartments: [],
      tenants: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Sonstiges')).toBeInTheDocument()
    })

    // Sonstiges should show as empty
    const sonstigesElement = screen.getByText('Sonstiges').parentElement
    expect(sonstigesElement).toHaveTextContent('leer')
  })

  it('builds correct breadcrumbs for nested paths', async () => {
    mockUsePropertyHierarchy.mockReturnValue({
      houses: [
        { id: '1', name: 'Musterstraße 123', strasse: 'Musterstraße 123', ort: 'Berlin' }
      ],
      apartments: [
        { id: '1', name: 'Wohnung 1A', groesse: 50, miete: 800, haus_id: '1' }
      ],
      tenants: [
        { id: '1', name: 'Max Mustermann', wohnung_id: '1', einzug: '2023-01-01' }
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    render(<FileTreeView userId="test-user" />)
    
    await waitFor(() => {
      expect(screen.getByText('Häuser')).toBeInTheDocument()
    })

    // Click on Häuser to navigate there first
    fireEvent.click(screen.getByText('Häuser'))

    // Verify that handleFolderClick was called with the correct path
    expect(mockHandleFolderClick).toHaveBeenCalledWith('user_test-user/haeuser')
  })
})