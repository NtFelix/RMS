import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '@/components/cloud-storage/file-upload-zone'
import { useCloudStorageStore } from '@/hooks/use-cloud-storage-store'
import { validateFile, uploadFile } from '@/lib/storage-service'

// Mock the storage service
jest.mock('@/lib/storage-service')
jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ 
        data: { user: { id: 'test-user-123' } }, 
        error: null 
      })
    },
    storage: {
      from: () => ({
        upload: jest.fn().mockResolvedValue({ 
          data: { path: 'test/path' }, 
          error: null 
        })
      })
    }
  })
}))

const mockValidateFile = validateFile as jest.MockedFunction<typeof validateFile>
const mockUploadFile = uploadFile as jest.MockedFunction<typeof uploadFile>

// Test component that uses the store
function TestUploadComponent() {
  const { uploadQueue, isUploading, processUploadQueue } = useCloudStorageStore()
  
  return (
    <div>
      <FileUploadZone 
        targetPath="user_test-user-123/test-folder" 
        onUploadComplete={() => console.log('Upload complete')}
      />
      <div data-testid="upload-status">
        {isUploading ? 'Uploading...' : 'Ready'}
      </div>
      <div data-testid="queue-count">
        Queue: {uploadQueue.length}
      </div>
      <button 
        data-testid="process-queue" 
        onClick={() => processUploadQueue()}
      >
        Process Queue
      </button>
    </div>
  )
}

describe('File Upload Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateFile.mockReturnValue({ valid: true })
    mockUploadFile.mockResolvedValue({ success: true, data: { path: 'test/path' } })
    
    // Reset store state
    const store = useCloudStorageStore.getState()
    store.reset()
  })

  it('completes full upload workflow', async () => {
    const user = userEvent.setup()
    render(<TestUploadComponent />)
    
    // Initial state
    expect(screen.getByTestId('upload-status')).toHaveTextContent('Ready')
    expect(screen.getByTestId('queue-count')).toHaveTextContent('Queue: 0')
    
    // Create test file
    const testFile = new File(['test content'], 'test-document.pdf', { 
      type: 'application/pdf' 
    })
    
    // Upload file via file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, testFile)
    
    // Verify file was added to queue
    await waitFor(() => {
      expect(screen.getByTestId('queue-count')).toHaveTextContent('Queue: 1')
    })
    
    // Verify file appears in upload queue UI
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    expect(screen.getByText('Upload-Warteschlange (1)')).toBeInTheDocument()
    
    // Process the upload queue manually (since we're testing the integration)
    await user.click(screen.getByTestId('process-queue'))
    
    // Wait for upload to complete
    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledWith(
        testFile, 
        'user_test-user-123/test-folder/test-document.pdf'
      )
    })
    
    // Verify upload status updates
    await waitFor(() => {
      expect(screen.getByTestId('upload-status')).toHaveTextContent('Ready')
    })
  })

  it('handles multiple file uploads', async () => {
    const user = userEvent.setup()
    render(<TestUploadComponent />)
    
    // Create multiple test files
    const testFiles = [
      new File(['content 1'], 'document1.pdf', { type: 'application/pdf' }),
      new File(['content 2'], 'image1.jpg', { type: 'image/jpeg' }),
      new File(['content 3'], 'document2.txt', { type: 'text/plain' })
    ]
    
    // Upload files
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, testFiles)
    
    // Verify all files were added to queue
    await waitFor(() => {
      expect(screen.getByTestId('queue-count')).toHaveTextContent('Queue: 3')
    })
    
    // Verify all files appear in UI
    expect(screen.getByText('document1.pdf')).toBeInTheDocument()
    expect(screen.getByText('image1.jpg')).toBeInTheDocument()
    expect(screen.getByText('document2.txt')).toBeInTheDocument()
    expect(screen.getByText('Upload-Warteschlange (3)')).toBeInTheDocument()
    
    // Process uploads
    await user.click(screen.getByTestId('process-queue'))
    
    // Wait for all uploads to complete
    await waitFor(() => {
      expect(mockUploadFile).toHaveBeenCalledTimes(3)
    })
    
    expect(mockUploadFile).toHaveBeenCalledWith(testFiles[0], 'user_test-user-123/test-folder/document1.pdf')
    expect(mockUploadFile).toHaveBeenCalledWith(testFiles[1], 'user_test-user-123/test-folder/image1.jpg')
    expect(mockUploadFile).toHaveBeenCalledWith(testFiles[2], 'user_test-user-123/test-folder/document2.txt')
  })

  it('handles upload errors gracefully', async () => {
    const user = userEvent.setup()
    mockUploadFile.mockResolvedValue({ 
      success: false, 
      error: 'Storage quota exceeded' 
    })
    
    render(<TestUploadComponent />)
    
    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
    
    // Upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, testFile)
    
    // Process upload
    await user.click(screen.getByTestId('process-queue'))
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Storage quota exceeded')).toBeInTheDocument()
    })
    
    // Verify upload status returns to ready
    expect(screen.getByTestId('upload-status')).toHaveTextContent('Ready')
  })

  it('validates files before adding to queue', async () => {
    const user = userEvent.setup()
    mockValidateFile.mockReturnValue({ 
      valid: false, 
      error: 'File too large' 
    })
    
    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<TestUploadComponent />)
    
    const testFile = new File(['test content'], 'large-file.pdf', { type: 'application/pdf' })
    
    // Upload file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, testFile)
    
    // Verify file was not added to queue due to validation error
    expect(screen.getByTestId('queue-count')).toHaveTextContent('Queue: 0')
    expect(consoleSpy).toHaveBeenCalledWith('File validation errors:', ['large-file.pdf: File too large'])
    
    consoleSpy.mockRestore()
  })

  it('supports drag and drop upload', async () => {
    render(<TestUploadComponent />)
    
    const testFile = new File(['test content'], 'dropped-file.pdf', { type: 'application/pdf' })
    const uploadZone = screen.getByTestId('upload-card')
    
    // Simulate drag and drop
    fireEvent.dragEnter(uploadZone, {
      dataTransfer: {
        items: [{ kind: 'file' }],
        files: [testFile]
      }
    })
    
    // Verify drag state
    expect(screen.getByText('Dateien hier ablegen')).toBeInTheDocument()
    
    fireEvent.drop(uploadZone, {
      dataTransfer: {
        files: [testFile]
      }
    })
    
    // Verify file was added to queue
    await waitFor(() => {
      expect(screen.getByTestId('queue-count')).toHaveTextContent('Queue: 1')
    })
    
    expect(screen.getByText('dropped-file.pdf')).toBeInTheDocument()
  })
})