import { renderHook, act } from '@testing-library/react'
import { useCloudStorageStore, useCloudStorageUpload } from '@/hooks/use-cloud-storage-store'

// Mock the storage service
jest.mock('@/lib/storage-service', () => ({
  uploadFile: jest.fn()
}))

describe('useCloudStorageUpload', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCloudStorageStore())
    act(() => {
      result.current.reset()
    })
    
    // Clear all mocks
    jest.clearAllMocks()
  })

  it('adds files to upload queue', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFiles = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]
    const targetPath = 'user_123/test'
    
    act(() => {
      result.current.addToUploadQueue(testFiles, targetPath)
    })
    
    expect(result.current.uploadQueue).toHaveLength(2)
    expect(result.current.uploadQueue[0].file.name).toBe('test1.pdf')
    expect(result.current.uploadQueue[0].targetPath).toBe(targetPath)
    expect(result.current.uploadQueue[0].status).toBe('pending')
    expect(result.current.uploadQueue[0].progress).toBe(0)
    
    expect(result.current.uploadQueue[1].file.name).toBe('test2.jpg')
    expect(result.current.uploadQueue[1].targetPath).toBe(targetPath)
    expect(result.current.uploadQueue[1].status).toBe('pending')
    expect(result.current.uploadQueue[1].progress).toBe(0)
  })

  it('updates upload progress', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    act(() => {
      result.current.addToUploadQueue([testFile], 'user_123/test')
    })
    
    const uploadId = result.current.uploadQueue[0].id
    
    act(() => {
      result.current.updateUploadProgress(uploadId, 50)
    })
    
    expect(result.current.uploadQueue[0].progress).toBe(50)
  })

  it('updates upload status', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    act(() => {
      result.current.addToUploadQueue([testFile], 'user_123/test')
    })
    
    const uploadId = result.current.uploadQueue[0].id
    
    act(() => {
      result.current.updateUploadStatus(uploadId, 'uploading')
    })
    
    expect(result.current.uploadQueue[0].status).toBe('uploading')
    
    act(() => {
      result.current.updateUploadStatus(uploadId, 'error', 'Network error')
    })
    
    expect(result.current.uploadQueue[0].status).toBe('error')
    expect(result.current.uploadQueue[0].error).toBe('Network error')
  })

  it('removes files from upload queue', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFiles = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]
    
    act(() => {
      result.current.addToUploadQueue(testFiles, 'user_123/test')
    })
    
    expect(result.current.uploadQueue).toHaveLength(2)
    
    const firstUploadId = result.current.uploadQueue[0].id
    
    act(() => {
      result.current.removeFromUploadQueue(firstUploadId)
    })
    
    expect(result.current.uploadQueue).toHaveLength(1)
    expect(result.current.uploadQueue[0].file.name).toBe('test2.jpg')
  })

  it('clears upload queue', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFiles = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]
    
    act(() => {
      result.current.addToUploadQueue(testFiles, 'user_123/test')
    })
    
    expect(result.current.uploadQueue).toHaveLength(2)
    
    act(() => {
      result.current.clearUploadQueue()
    })
    
    expect(result.current.uploadQueue).toHaveLength(0)
  })

  it('sets uploading state', () => {
    const { result } = renderHook(() => useCloudStorageUpload())
    
    expect(result.current.isUploading).toBe(false)
    
    act(() => {
      result.current.setUploading(true)
    })
    
    expect(result.current.isUploading).toBe(true)
    
    act(() => {
      result.current.setUploading(false)
    })
    
    expect(result.current.isUploading).toBe(false)
  })

  it('processes upload queue successfully', async () => {
    const { uploadFile } = require('@/lib/storage-service')
    uploadFile.mockResolvedValue({ success: true, data: { path: 'test/path' } })
    
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    act(() => {
      result.current.addToUploadQueue([testFile], 'user_123/test')
    })
    
    await act(async () => {
      await result.current.processUploadQueue()
    })
    
    expect(uploadFile).toHaveBeenCalledWith(testFile, 'user_123/test/test.pdf')
    expect(result.current.uploadQueue[0].status).toBe('completed')
    expect(result.current.uploadQueue[0].progress).toBe(100)
    expect(result.current.isUploading).toBe(false)
  })

  it('handles upload queue processing errors', async () => {
    const { uploadFile } = require('@/lib/storage-service')
    uploadFile.mockResolvedValue({ success: false, error: 'Upload failed' })
    
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    act(() => {
      result.current.addToUploadQueue([testFile], 'user_123/test')
    })
    
    await act(async () => {
      await result.current.processUploadQueue()
    })
    
    expect(result.current.uploadQueue[0].status).toBe('error')
    expect(result.current.uploadQueue[0].error).toBe('Upload failed')
    expect(result.current.isUploading).toBe(false)
  })

  it('handles upload queue processing exceptions', async () => {
    const { uploadFile } = require('@/lib/storage-service')
    uploadFile.mockRejectedValue(new Error('Network error'))
    
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    act(() => {
      result.current.addToUploadQueue([testFile], 'user_123/test')
    })
    
    await act(async () => {
      await result.current.processUploadQueue()
    })
    
    expect(result.current.uploadQueue[0].status).toBe('error')
    expect(result.current.uploadQueue[0].error).toBe('Network error')
    expect(result.current.isUploading).toBe(false)
  })

  it('processes multiple files sequentially', async () => {
    const { uploadFile } = require('@/lib/storage-service')
    uploadFile.mockResolvedValue({ success: true, data: { path: 'test/path' } })
    
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFiles = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]
    
    act(() => {
      result.current.addToUploadQueue(testFiles, 'user_123/test')
    })
    
    await act(async () => {
      await result.current.processUploadQueue()
    })
    
    expect(uploadFile).toHaveBeenCalledTimes(2)
    expect(uploadFile).toHaveBeenCalledWith(testFiles[0], 'user_123/test/test1.pdf')
    expect(uploadFile).toHaveBeenCalledWith(testFiles[1], 'user_123/test/test2.jpg')
    
    expect(result.current.uploadQueue[0].status).toBe('completed')
    expect(result.current.uploadQueue[1].status).toBe('completed')
    expect(result.current.isUploading).toBe(false)
  })

  it('skips non-pending items when processing queue', async () => {
    const { uploadFile } = require('@/lib/storage-service')
    uploadFile.mockResolvedValue({ success: true, data: { path: 'test/path' } })
    
    const { result } = renderHook(() => useCloudStorageUpload())
    
    const testFiles = [
      new File(['test1'], 'test1.pdf', { type: 'application/pdf' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' })
    ]
    
    act(() => {
      result.current.addToUploadQueue(testFiles, 'user_123/test')
    })
    
    // Mark first file as completed
    const firstId = result.current.uploadQueue[0].id
    act(() => {
      result.current.updateUploadStatus(firstId, 'completed')
    })
    
    await act(async () => {
      await result.current.processUploadQueue()
    })
    
    // Should only upload the second file
    expect(uploadFile).toHaveBeenCalledTimes(1)
    expect(uploadFile).toHaveBeenCalledWith(testFiles[1], 'user_123/test/test2.jpg')
  })
})