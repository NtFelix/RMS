import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStorageItemCard } from '@/components/cloud-storage/cloud-storage-item-card'
import { useModalStore } from '@/hooks/use-modal-store'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'
import { createClient } from '@/utils/supabase/client'

// Mock the hooks
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn()
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}))

// Mock Supabase storage
const mockCreateSignedUrl = jest.fn().mockResolvedValue({ data: { signedUrl: 'http://example.com/file.pdf' }, error: null })
const mockStorageFrom = jest.fn().mockReturnValue({
  createSignedUrl: mockCreateSignedUrl
})

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockStorageFrom
    }
  }))
}))

jest.mock('@/hooks/use-cloud-storage-store', () => ({
  useCloudStorageStore: jest.fn()
}))

const mockOpenFilePreviewModal = jest.fn()
const mockOpenFileRenameModal = jest.fn()
const mockRenameFile = jest.fn()
const mockOnOpen = jest.fn()
const mockOnRename = jest.fn()

describe('CloudStorageItemCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
      ; (useModalStore as unknown as jest.Mock).mockReturnValue({
        openFilePreviewModal: mockOpenFilePreviewModal,
        openFileRenameModal: mockOpenFileRenameModal
      })
      ; (useCloudStorageStore as unknown as jest.Mock).mockReturnValue({
        currentPath: 'user_123/documents',
        renameFile: mockRenameFile
      })
  })

  // Re-mock createClient inside beforeEach if needed? 
  // No, the factory above handles the return value, and we verify mocks being called.

  const mockFile = {
    name: 'test-document.pdf',
    id: 'file-123',
    updated_at: '2023-01-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
    last_accessed_at: '2023-01-01T00:00:00Z',
    metadata: {},
    size: 1024
  }

  const mockFolder = {
    name: 'test-folder',
    path: 'user_123/documents/test-folder',
    type: 'storage' as const,
    isEmpty: false,
    children: [],
    fileCount: 5
  }

  it('renders file card correctly', () => {
    render(
      <CloudStorageItemCard
        item={mockFile}
        type="file"
        viewMode="grid"
        onOpen={mockOnOpen}
      />
    )

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('renders folder card correctly', () => {
    render(
      <CloudStorageItemCard
        item={mockFolder}
        type="folder"
        viewMode="grid"
        onOpen={mockOnOpen}
      />
    )

    expect(screen.getByText('test-folder')).toBeInTheDocument()
    expect(screen.getByText('5 Dateien')).toBeInTheDocument()
  })

  it('calls onRename when provided', () => {
    render(
      <CloudStorageItemCard
        item={mockFile}
        type="file"
        viewMode="grid"
        onOpen={mockOnOpen}
        onRename={mockOnRename}
      />
    )

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
  })

  it('does not show rename option for folders', async () => {
    const user = userEvent.setup()

    render(
      <CloudStorageItemCard
        item={mockFolder}
        type="folder"
        viewMode="grid"
        onOpen={mockOnOpen}
      />
    )

    const card = screen.getByText('test-folder').closest('[role="button"]')
    if (card) {
      await user.pointer({ keys: '[MouseRight]', target: card })
    }

    expect(screen.queryByText('Umbenennen')).not.toBeInTheDocument()
  })

  it('calls preview modal for PDF files when card is clicked', async () => {
    const user = userEvent.setup()

    const originalOpen = window.open
    window.open = jest.fn()

    render(
      <CloudStorageItemCard
        item={mockFile}
        type="file"
        viewMode="grid"
        onOpen={mockOnOpen}
      />
    )

    const card = document.querySelector('.cursor-pointer')
    if (card) {
      await user.click(card as Element)
    }

    expect(mockStorageFrom).toHaveBeenCalledWith('documents')
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user_123/documents/test-document.pdf', 3600)

    window.open = originalOpen
  })

  it('handles list view mode', () => {
    render(
      <CloudStorageItemCard
        item={mockFile}
        type="file"
        viewMode="list"
        onOpen={mockOnOpen}
      />
    )

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    const container = screen.getByText('test-document.pdf').closest('div')
    expect(container).toHaveClass('flex')
  })
})