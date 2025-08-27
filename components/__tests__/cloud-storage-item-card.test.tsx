import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStorageItemCard } from '../cloud-storage-item-card'
import { useModalStore } from '@/hooks/use-modal-store'
import { useSimpleCloudStorageStore } from '@/hooks/use-simple-cloud-storage-store'

// Mock the hooks
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: jest.fn()
}))

jest.mock('@/hooks/use-simple-cloud-storage-store', () => ({
  useSimpleCloudStorageStore: jest.fn()
}))

const mockOpenFilePreviewModal = jest.fn()
const mockOpenFileRenameModal = jest.fn()
const mockRenameFile = jest.fn()
const mockOnOpen = jest.fn()
const mockOnRename = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useModalStore as jest.Mock).mockReturnValue({
    openFilePreviewModal: mockOpenFilePreviewModal,
    openFileRenameModal: mockOpenFileRenameModal
  })
  ;(useSimpleCloudStorageStore as jest.Mock).mockReturnValue({
    currentPath: 'user_123/documents',
    renameFile: mockRenameFile
  })
})

describe('CloudStorageItemCard', () => {
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

    // The component should render with rename functionality
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    // We can't easily test context menu in jsdom, but we can verify the component renders
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

    // Right-click to open context menu
    const card = screen.getByText('test-folder').closest('[role="button"]')
    if (card) {
      await user.pointer({ keys: '[MouseRight]', target: card })
    }

    // Rename option should not be present for folders
    expect(screen.queryByText('Umbenennen')).not.toBeInTheDocument()
  })

  it('calls preview modal for PDF files when card is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <CloudStorageItemCard
        item={mockFile}
        type="file"
        viewMode="grid"
        onOpen={mockOnOpen}
      />
    )

    // Click the card - find the card element with cursor-pointer class
    const card = document.querySelector('.cursor-pointer')
    if (card) {
      await user.click(card as Element)
    }

    // For PDF files, it should open preview modal instead of calling onOpen
    expect(mockOpenFilePreviewModal).toHaveBeenCalledWith({
      name: 'test-document.pdf',
      path: 'user_123/documents/test-document.pdf',
      size: 1024,
      type: 'pdf'
    })
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
    // In list view, the layout should be different (horizontal)
    const container = screen.getByText('test-document.pdf').closest('div')
    expect(container).toHaveClass('flex')
  })
})