import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FilePreviewModal } from '../file-preview-modal'
import { useCloudStoragePreview, useCloudStorageOperations } from '@/hooks/use-cloud-storage-store'
import { useToast } from '@/hooks/use-toast'

// Mock the hooks
jest.mock('@/hooks/use-cloud-storage-store')
jest.mock('@/hooks/use-toast')

const mockUseCloudStoragePreview = useCloudStoragePreview as jest.MockedFunction<typeof useCloudStoragePreview>
const mockUseCloudStorageOperations = useCloudStorageOperations as jest.MockedFunction<typeof useCloudStorageOperations>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('FilePreviewModal', () => {
  const mockToast = jest.fn()
  const mockClosePreview = jest.fn()
  const mockDownloadFile = jest.fn()

  beforeEach(() => {
    mockUseToast.mockReturnValue({ toast: mockToast })
    mockUseCloudStorageOperations.mockReturnValue({
      downloadFile: mockDownloadFile,
      isOperationInProgress: false,
      operationError: null,
      deleteFile: jest.fn(),
      renameFile: jest.fn(),
      moveFile: jest.fn(),
      setOperationInProgress: jest.fn(),
      setOperationError: jest.fn(),
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when preview is closed', () => {
    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: null,
      isPreviewOpen: false,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render loading state when preview is open', () => {
    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: {
        name: 'test.pdf',
        id: '1',
        updated_at: '2023-01-01',
        created_at: '2023-01-01',
        last_accessed_at: '2023-01-01',
        metadata: {},
        size: 1024000,
      },
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)
    
    expect(screen.getByText('Lade Vorschau...')).toBeInTheDocument()
  })

  it('should render modal with file name when preview is open', async () => {
    const mockFile = {
      name: 'test.jpg',
      id: '1',
      updated_at: '2023-01-01',
      created_at: '2023-01-01',
      last_accessed_at: '2023-01-01',
      metadata: {},
      size: 1024000,
    }

    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: mockFile,
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)

    expect(screen.getByText('test.jpg')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should render PDF file name in modal', async () => {
    const mockFile = {
      name: 'test.pdf',
      id: '1',
      updated_at: '2023-01-01',
      created_at: '2023-01-01',
      last_accessed_at: '2023-01-01',
      metadata: {},
      size: 1024000,
    }

    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: mockFile,
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)

    expect(screen.getByText('test.pdf')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should render unsupported file type name', async () => {
    const mockFile = {
      name: 'test.zip',
      id: '1',
      updated_at: '2023-01-01',
      created_at: '2023-01-01',
      last_accessed_at: '2023-01-01',
      metadata: {},
      size: 1024000,
    }

    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: mockFile,
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)

    expect(screen.getByText('test.zip')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should call close preview when modal is closed', () => {
    const mockFile = {
      name: 'test.pdf',
      id: '1',
      updated_at: '2023-01-01',
      created_at: '2023-01-01',
      last_accessed_at: '2023-01-01',
      metadata: {},
      size: 1024000,
    }

    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: mockFile,
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)

    const closeButton = screen.getByRole('button', { name: /close/i })
    fireEvent.click(closeButton)

    expect(mockClosePreview).toHaveBeenCalled()
  })

  it('should detect file types correctly', () => {
    const imageFile = {
      name: 'image.jpg',
      id: '1',
      updated_at: '2023-01-01',
      created_at: '2023-01-01',
      last_accessed_at: '2023-01-01',
      metadata: {},
      size: 1024000,
    }

    mockUseCloudStoragePreview.mockReturnValue({
      previewFile: imageFile,
      isPreviewOpen: true,
      openPreview: jest.fn(),
      closePreview: mockClosePreview,
    })

    render(<FilePreviewModal />)

    expect(screen.getByText('image.jpg')).toBeInTheDocument()
  })
})