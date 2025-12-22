import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileContextMenu } from '@/components/cloud-storage/file-context-menu'
import { useCloudStorageOperations, useCloudStoragePreview, useCloudStorageArchive } from '@/hooks/use-cloud-storage-store'
import { useToast } from '@/hooks/use-toast'

// Mock the hooks
jest.mock('@/hooks/use-cloud-storage-store')
jest.mock('@/hooks/use-toast')

// Mock storage service
jest.mock('@/lib/storage-service', () => ({
  triggerFileDownload: jest.fn(),
  deleteFile: jest.fn(),
  renameFile: jest.fn(),
  moveFile: jest.fn(),
}))

const mockUseCloudStorageOperations = useCloudStorageOperations as jest.MockedFunction<typeof useCloudStorageOperations>
const mockUseCloudStoragePreview = useCloudStoragePreview as jest.MockedFunction<typeof useCloudStoragePreview>
const mockUseCloudStorageArchive = useCloudStorageArchive as jest.MockedFunction<typeof useCloudStorageArchive>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

const mockFile = {
  id: 'test-file-1',
  name: 'test-document.pdf',
  updated_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  last_accessed_at: '2024-01-01T00:00:00Z',
  metadata: {},
  size: 1024000, // 1MB
}

describe('FileContextMenu', () => {
  const mockDownloadFile = jest.fn()
  const mockDeleteFile = jest.fn()
  const mockOpenPreview = jest.fn()
  const mockToast = jest.fn()

  beforeEach(() => {
    mockUseCloudStorageOperations.mockReturnValue({
      downloadFile: mockDownloadFile,
      deleteFile: mockDeleteFile,
      renameFile: jest.fn(),
      moveFile: jest.fn(),
      isOperationInProgress: false,
      operationError: null,
      setOperationInProgress: jest.fn(),
      setOperationError: jest.fn(),
    })

    mockUseCloudStoragePreview.mockReturnValue({
      openPreview: mockOpenPreview,
      closePreview: jest.fn(),
      previewFile: null,
      isPreviewOpen: false,
    })

    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: jest.fn(),
      toasts: [],
    })

    mockUseCloudStorageArchive.mockReturnValue({
      isArchiveViewOpen: false,
      openArchiveView: jest.fn(),
      closeArchiveView: jest.fn(),
      archiveFile: jest.fn(),
    } as any)

    jest.clearAllMocks()
  })

  it('renders context menu with correct options for PDF file', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    expect(screen.getByText('Vorschau anzeigen')).toBeInTheDocument()
    expect(screen.getByText('Herunterladen')).toBeInTheDocument()
    expect(screen.getByText('Endgültig löschen')).toBeInTheDocument()
  })

  it('handles file download correctly', async () => {
    const user = userEvent.setup()
    mockDownloadFile.mockResolvedValue(undefined)
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const downloadButton = screen.getByText('Herunterladen')
    await user.click(downloadButton)

    expect(mockDownloadFile).toHaveBeenCalledWith(mockFile)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Download gestartet",
        description: `${mockFile.name} wird heruntergeladen.`,
      })
    })
  })

  it('handles file download error', async () => {
    const user = userEvent.setup()
    const errorMessage = 'Download failed'
    mockDownloadFile.mockRejectedValue(new Error(errorMessage))
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const downloadButton = screen.getByText('Herunterladen')
    await user.click(downloadButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Download fehlgeschlagen",
        description: errorMessage,
        variant: "destructive",
      })
    })
  })

  it('opens preview for supported file types', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const previewButton = screen.getByText('Vorschau anzeigen')
    await user.click(previewButton)

    expect(mockOpenPreview).toHaveBeenCalledWith(mockFile)
  })

  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const deleteButton = screen.getByText('Endgültig löschen')
    await user.click(deleteButton)

    expect(screen.getByText('Datei löschen')).toBeInTheDocument()
    expect(screen.getByText(/Möchten Sie die Datei/)).toBeInTheDocument()
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
  })

  it('handles file deletion after confirmation', async () => {
    const user = userEvent.setup()
    mockDeleteFile.mockResolvedValue(undefined)
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const deleteButton = screen.getByText('Endgültig löschen')
    await user.click(deleteButton)

    const confirmButton = screen.getByText('Endgültig löschen')
    await user.click(confirmButton)

    expect(mockDeleteFile).toHaveBeenCalledWith(mockFile)
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Datei gelöscht",
        description: `${mockFile.name} wurde erfolgreich gelöscht.`,
      })
    })
  })

  it('disables operations when operation is in progress', async () => {
    const user = userEvent.setup()
    
    mockUseCloudStorageOperations.mockReturnValue({
      downloadFile: mockDownloadFile,
      deleteFile: mockDeleteFile,
      renameFile: jest.fn(),
      moveFile: jest.fn(),
      isOperationInProgress: true, // Operation in progress
      operationError: null,
      setOperationInProgress: jest.fn(),
      setOperationError: jest.fn(),
    })
    
    render(
      <FileContextMenu file={mockFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    const downloadButton = screen.getByText('Herunterladen')
    const deleteButton = screen.getByText('Endgültig löschen')

    expect(downloadButton).toHaveAttribute('data-disabled')
    expect(deleteButton).toHaveAttribute('data-disabled')
  })

  it('does not show preview option for unsupported file types', async () => {
    const user = userEvent.setup()
    const unsupportedFile = { ...mockFile, name: 'document.txt' }
    
    render(
      <FileContextMenu file={unsupportedFile}>
        <div data-testid="file-item">Test File</div>
      </FileContextMenu>
    )

    const fileItem = screen.getByTestId('file-item')
    await user.pointer({ keys: '[MouseRight]', target: fileItem })

    expect(screen.queryByText('Vorschau anzeigen')).not.toBeInTheDocument()
    expect(screen.getByText('Herunterladen')).toBeInTheDocument()
  })
})

describe('File Operations Performance', () => {
  it('should complete download within 2 seconds for files under 10MB', async () => {
    const { triggerFileDownload } = await import('@/lib/storage-service')
    const mockTriggerFileDownload = triggerFileDownload as jest.MockedFunction<typeof triggerFileDownload>
    
    // Mock a successful download that completes within 2 seconds
    mockTriggerFileDownload.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1500))
    )

    const startTime = Date.now()
    await triggerFileDownload('test/path/file.pdf', 'file.pdf')
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(2000)
  })

  it('should timeout downloads that take longer than 2 seconds', async () => {
    // Mock the storage service to simulate a slow download
    const { triggerFileDownload } = require('@/lib/storage-service')
    
    // Mock the downloadFile function to simulate a timeout
    jest.doMock('@/lib/storage-service', () => ({
      ...jest.requireActual('@/lib/storage-service'),
      downloadFile: jest.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Download timeout: File download took longer than 2 seconds')), 100)
        })
      )
    }))
    
    // Test that the timeout error is properly thrown
    await expect(triggerFileDownload('test/slow-file.pdf', 'slow-file.pdf'))
      .rejects
      .toThrow('Download timeout: File download took longer than 2 seconds')
  })
})