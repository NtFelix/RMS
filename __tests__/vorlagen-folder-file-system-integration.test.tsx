/**
 * Integration tests for Vorlagen folder file system integration
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CloudStorageSimple } from '@/components/cloud-storage-simple'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock the hooks
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/use-simple-cloud-storage-store')

// Mock the actions
jest.mock('@/app/(dashboard)/dateien/actions', () => ({
  getInitialFiles: jest.fn(),
  loadFilesForPath: jest.fn()
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('Vorlagen Folder File System Integration', () => {
  const mockToast = jest.fn()
  const mockOpenTemplateCreateModal = jest.fn()
  const mockOpenUploadModal = jest.fn()
  const mockOpenCreateFolderModal = jest.fn()
  const mockOpenCreateFileModal = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: []
    })

    mockUseModalStore.mockReturnValue({
      openUploadModal: mockOpenUploadModal,
      openCreateFolderModal: mockOpenCreateFolderModal,
      openCreateFileModal: mockOpenCreateFileModal,
      openTemplateCreateModal: mockOpenTemplateCreateModal,
      // Add other required modal store properties
      isUploadModalOpen: false,
      uploadModalData: null,
      closeUploadModal: jest.fn(),
      isCreateFolderModalOpen: false,
      createFolderModalData: null,
      closeCreateFolderModal: jest.fn(),
      isCreateFileModalOpen: false,
      createFileModalData: null,
      closeCreateFileModal: jest.fn(),
      isTemplateCreateModalOpen: false,
      templateCreateModalData: null,
      closeTemplateCreateModal: jest.fn(),
      isTemplateCreateModalDirty: false,
      setTemplateCreateModalDirty: jest.fn()
    } as any)

    // Mock the cloud storage store
    require('@/hooks/use-simple-cloud-storage-store').useSimpleCloudStorageStore.mockReturnValue({
      currentPath: 'user_123',
      files: [],
      folders: [
        {
          name: 'Vorlagen',
          path: 'user_123/Vorlagen',
          type: 'category',
          isEmpty: false,
          children: [],
          fileCount: 2,
          displayName: 'Vorlagen'
        }
      ],
      isLoading: false,
      error: null,
      navigateToPath: jest.fn(),
      setFiles: jest.fn(),
      setFolders: jest.fn(),
      refreshCurrentPath: jest.fn()
    })
  })

  it('should display Vorlagen folder in root directory', async () => {
    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123"
        initialFiles={[]}
        initialFolders={[
          {
            name: 'Vorlagen',
            path: 'user_123/Vorlagen',
            type: 'category',
            isEmpty: false,
            children: [],
            fileCount: 2,
            displayName: 'Vorlagen'
          }
        ]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Vorlagen')).toBeInTheDocument()
    })

    // Check that the folder shows file count
    expect(screen.getByText('2 Dateien')).toBeInTheDocument()
  })

  it('should show "Vorlage erstellen" option in create dropdown', async () => {
    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123"
        initialFiles={[]}
        initialFolders={[]}
      />
    )

    // Find and click the create dropdown button
    const createButton = screen.getByRole('button', { name: /erstellen/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
      expect(screen.getByText('Ordner erstellen')).toBeInTheDocument()
    })
  })

  it('should open template create modal when "Vorlage erstellen" is clicked', async () => {
    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123"
        initialFiles={[]}
        initialFolders={[]}
      />
    )

    // Open the create dropdown
    const createButton = screen.getByRole('button', { name: /erstellen/i })
    fireEvent.click(createButton)

    // Click "Vorlage erstellen"
    const createTemplateOption = await screen.findByText('Vorlage erstellen')
    fireEvent.click(createTemplateOption)

    expect(mockOpenTemplateCreateModal).toHaveBeenCalledWith({
      onSuccess: expect.any(Function)
    })
  })

  it('should display template files with .vorlage extension', async () => {
    const mockTemplateFiles = [
      {
        name: 'Mietvertrag Standard.vorlage',
        id: 'template_123',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: { 
          size: 500,
          kategorie: 'vertrag',
          mimetype: 'application/x-vorlage'
        },
        size: 500
      },
      {
        name: 'E-Mail Vorlage.vorlage',
        id: 'template_456',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: { 
          size: 300,
          kategorie: 'mail',
          mimetype: 'application/x-vorlage'
        },
        size: 300
      }
    ]

    // Mock the store to return template files when in Vorlagen folder
    require('@/hooks/use-simple-cloud-storage-store').useSimpleCloudStorageStore.mockReturnValue({
      currentPath: 'user_123/Vorlagen',
      files: mockTemplateFiles,
      folders: [],
      isLoading: false,
      error: null,
      navigateToPath: jest.fn(),
      setFiles: jest.fn(),
      setFolders: jest.fn(),
      refreshCurrentPath: jest.fn()
    })

    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123/Vorlagen"
        initialFiles={mockTemplateFiles}
        initialFolders={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Mietvertrag Standard.vorlage')).toBeInTheDocument()
      expect(screen.getByText('E-Mail Vorlage.vorlage')).toBeInTheDocument()
    })
  })

  it('should handle template creation success callback', async () => {
    const mockRefresh = jest.fn()
    
    // Mock the store with refresh function
    require('@/hooks/use-simple-cloud-storage-store').useSimpleCloudStorageStore.mockReturnValue({
      currentPath: 'user_123',
      files: [],
      folders: [],
      isLoading: false,
      error: null,
      navigateToPath: jest.fn(),
      setFiles: jest.fn(),
      setFolders: jest.fn(),
      refreshCurrentPath: mockRefresh
    })

    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123"
        initialFiles={[]}
        initialFolders={[]}
      />
    )

    // Open create dropdown and click template creation
    const createButton = screen.getByRole('button', { name: /erstellen/i })
    fireEvent.click(createButton)

    const createTemplateOption = await screen.findByText('Vorlage erstellen')
    fireEvent.click(createTemplateOption)

    // Get the success callback that was passed to openTemplateCreateModal
    const successCallback = mockOpenTemplateCreateModal.mock.calls[0][0].onSuccess

    // Simulate successful template creation
    const mockTemplate = {
      id: 'new-template-123',
      titel: 'New Template',
      inhalt: 'Template content',
      kategorie: 'mail'
    }

    successCallback(mockTemplate)

    // Verify that refresh was called and toast was shown
    expect(mockRefresh).toHaveBeenCalled()
    expect(mockToast).toHaveBeenCalledWith({
      title: "Template erstellt",
      description: 'Das Template "New Template" wurde erfolgreich erstellt.',
    })
  })

  it('should show empty state when Vorlagen folder is empty', async () => {
    // Mock empty Vorlagen folder
    require('@/hooks/use-simple-cloud-storage-store').useSimpleCloudStorageStore.mockReturnValue({
      currentPath: 'user_123/Vorlagen',
      files: [],
      folders: [],
      isLoading: false,
      error: null,
      navigateToPath: jest.fn(),
      setFiles: jest.fn(),
      setFolders: jest.fn(),
      refreshCurrentPath: jest.fn()
    })

    render(
      <CloudStorageSimple
        userId="123"
        initialPath="user_123/Vorlagen"
        initialFiles={[]}
        initialFolders={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/noch keine dateien vorhanden/i)).toBeInTheDocument()
    })
  })
})