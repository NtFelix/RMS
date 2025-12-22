import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '@/components/file-upload-zone'
import { useCloudStorageUpload } from '@/hooks/use-cloud-storage-store'
import { validateFile } from '@/lib/storage-service'

// Mock the hooks and services
jest.mock('@/hooks/use-cloud-storage-store')
jest.mock('@/lib/storage-service')

const mockUseCloudStorageUpload = useCloudStorageUpload as jest.MockedFunction<typeof useCloudStorageUpload>
const mockValidateFile = validateFile as jest.MockedFunction<typeof validateFile>

describe('FileUploadZone', () => {
  const mockAddToUploadQueue = jest.fn()
  const mockRemoveFromUploadQueue = jest.fn()
  const mockClearUploadQueue = jest.fn()
  const mockProcessUploadQueue = jest.fn().mockResolvedValue(undefined)
  const mockOnUploadComplete = jest.fn()

  const defaultMockReturn = {
    uploadQueue: [],
    isUploading: false,
    addToUploadQueue: mockAddToUploadQueue,
    removeFromUploadQueue: mockRemoveFromUploadQueue,
    clearUploadQueue: mockClearUploadQueue,
    processUploadQueue: mockProcessUploadQueue,
    updateUploadProgress: jest.fn(),
    updateUploadStatus: jest.fn(),
    setUploading: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCloudStorageUpload.mockReturnValue(defaultMockReturn)
    mockValidateFile.mockReturnValue({ valid: true })
  })

  it('renders upload zone with correct content', () => {
    render(<FileUploadZone targetPath="user_123/test" />)

    expect(screen.getByText('Dateien hochladen')).toBeInTheDocument()
    expect(screen.getByText('Ziehen Sie Dateien hierher oder klicken Sie, um Dateien auszuwählen')).toBeInTheDocument()
    expect(screen.getByText('Unterstützte Formate: PDF, Bilder (JPG, PNG), Dokumente')).toBeInTheDocument()
    expect(screen.getByText('Maximale Dateigröße: 10 MB')).toBeInTheDocument()
  })

  it('opens file picker when clicking the upload zone', async () => {
    const user = userEvent.setup()
    render(<FileUploadZone targetPath="user_123/test" />)

    const uploadZone = screen.getByText('Dateien hochladen').closest('div')
    expect(uploadZone).toBeInTheDocument()

    // Mock file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => { })

    await user.click(uploadZone!)
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  it('opens file picker when clicking the select files button', async () => {
    const user = userEvent.setup()
    render(<FileUploadZone targetPath="user_123/test" />)

    const selectButton = screen.getByRole('button', { name: /dateien auswählen/i })

    // Mock file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => { })

    await user.click(selectButton)
    expect(clickSpy).toHaveBeenCalled()

    clickSpy.mockRestore()
  })

  it('handles file selection and validates files', async () => {
    const user = userEvent.setup()
    render(<FileUploadZone targetPath="user_123/test" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, testFile)

    expect(mockValidateFile).toHaveBeenCalledWith(testFile)
    expect(mockAddToUploadQueue).toHaveBeenCalledWith([testFile], 'user_123/test')

    // Should trigger upload processing
    await waitFor(() => {
      expect(mockProcessUploadQueue).toHaveBeenCalled()
    })
  })

  it('handles drag and drop functionality', () => {
    render(<FileUploadZone targetPath="user_123/test" />)

    const uploadZone = screen.getByText('Dateien hochladen').closest('div')!
    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    // Simulate drag enter
    fireEvent.dragEnter(uploadZone, {
      dataTransfer: {
        items: [{ kind: 'file' }],
        files: [testFile]
      }
    })

    expect(screen.getByText('Dateien hier ablegen')).toBeInTheDocument()

    // Simulate drop
    fireEvent.drop(uploadZone, {
      dataTransfer: {
        files: [testFile]
      }
    })

    expect(mockValidateFile).toHaveBeenCalledWith(testFile)
    expect(mockAddToUploadQueue).toHaveBeenCalledWith([testFile], 'user_123/test')
  })

  it('displays upload queue when files are added', () => {
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 0,
        status: 'pending' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    expect(screen.getByText('Upload-Warteschlange (1)')).toBeInTheDocument()
    expect(screen.getByText('test.pdf')).toBeInTheDocument()
  })

  it('shows upload progress for uploading files', () => {
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 50,
        status: 'uploading' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue,
      isUploading: true
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Wird hochgeladen...')).toBeInTheDocument()
  })

  it('shows error messages for failed uploads', () => {
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 0,
        status: 'error' as const,
        error: 'Upload failed: Network error'
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    expect(screen.getByText('Upload failed: Network error')).toBeInTheDocument()
  })

  it('allows removing files from upload queue', async () => {
    const user = userEvent.setup()
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 0,
        status: 'pending' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    const removeButton = screen.getByRole('button', { name: '' }) // X button
    await user.click(removeButton)

    expect(mockRemoveFromUploadQueue).toHaveBeenCalledWith('1')
  })

  it('allows clearing entire upload queue', async () => {
    const user = userEvent.setup()
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 0,
        status: 'pending' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    const clearButton = screen.getByRole('button', { name: 'Alle entfernen' })
    await user.click(clearButton)

    expect(mockClearUploadQueue).toHaveBeenCalled()
  })

  it('calls onUploadComplete when all uploads finish successfully', async () => {
    const uploadQueue = [
      {
        id: '1',
        file: new File(['test'], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 100,
        status: 'completed' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue,
      isUploading: false
    })

    render(<FileUploadZone targetPath="user_123/test" onUploadComplete={mockOnUploadComplete} />)

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalled()
    })
  })

  it('handles file validation errors', async () => {
    const user = userEvent.setup()
    mockValidateFile.mockReturnValue({
      valid: false,
      error: 'File too large'
    })

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { })

    render(<FileUploadZone targetPath="user_123/test" />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const testFile = new File(['test content'], 'large-file.pdf', { type: 'application/pdf' })

    await user.upload(fileInput, testFile)

    expect(mockValidateFile).toHaveBeenCalledWith(testFile)
    expect(mockAddToUploadQueue).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith('File validation error:', 'large-file.pdf: File too large')

    consoleSpy.mockRestore()
  })

  it('disables functionality when disabled prop is true', () => {
    render(<FileUploadZone targetPath="user_123/test" disabled={true} />)

    // Check that the card has disabled styling
    const card = screen.getByTestId('upload-card')
    expect(card).toHaveClass('opacity-50', 'cursor-not-allowed')

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeDisabled()
  })

  it('formats file sizes correctly', () => {
    const uploadQueue = [
      {
        id: '1',
        file: new File(['x'.repeat(1024)], 'test.pdf', { type: 'application/pdf' }),
        targetPath: 'user_123/test',
        progress: 0,
        status: 'pending' as const
      }
    ]

    mockUseCloudStorageUpload.mockReturnValue({
      ...defaultMockReturn,
      uploadQueue
    })

    render(<FileUploadZone targetPath="user_123/test" />)

    expect(screen.getByText('1 KB')).toBeInTheDocument()
  })
})