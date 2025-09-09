/**
 * Unit tests for storage service
 */

import {
  validateFile,
  uploadFile,
  listFiles,
  downloadFile,
  deleteFile,
  moveFile,
  createPlaceholder,
  getFileUrl,
  storageService,
} from '../storage-service';

// Mock functions
const mockUpload = jest.fn();
const mockList = jest.fn();
const mockDownload = jest.fn();
const mockMove = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockGetUser = jest.fn();

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser
    },
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        list: mockList,
        download: mockDownload,
        move: mockMove,
        createSignedUrl: mockCreateSignedUrl
      }))
    }
  }))
}));

// Mock path utils
jest.mock('../path-utils', () => ({
  pathUtils: {
    sanitizePath: jest.fn((path) => path),
    buildUserPath: jest.fn((...args) => args.join('/'))
  },
  validatePath: jest.fn(() => true),
  isUserPath: jest.fn(() => true)
}));

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
      error: null
    });
    
    mockUpload.mockResolvedValue({
      data: { path: 'test-path' },
      error: null
    });
    
    mockList.mockResolvedValue({
      data: [
        {
          name: 'test-file.txt',
          id: 'file-123',
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          last_accessed_at: '2024-01-01T00:00:00Z',
          metadata: {},
          size: 1024
        }
      ],
      error: null
    });
    
    mockDownload.mockResolvedValue({
      data: new Blob(['test content']),
      error: null
    });
    
    mockMove.mockResolvedValue({ error: null });
    
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null
    });
  });

  describe('validateFile', () => {
    it('should validate file size', () => {
      const smallFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(smallFile, 'size', { value: 1024 });
      
      const result = validateFile(smallFile);
      expect(result.valid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB
      
      const result = validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum allowed size');
    });

    it('should validate supported file types', () => {
      const pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(pdfFile, 'size', { value: 1024 });
      
      const result = validateFile(pdfFile);
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported file types', () => {
      const unsupportedFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      Object.defineProperty(unsupportedFile, 'size', { value: 1024 });
      
      const result = validateFile(unsupportedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not supported');
    });
  });

  describe('uploadFile', () => {
    it('should upload a valid file successfully', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = await uploadFile(file, 'user_test-user-123/test.txt');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ path: 'test-path' });
    });

    it('should reject invalid files', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      Object.defineProperty(invalidFile, 'size', { value: 1024 });
      
      const result = await uploadFile(invalidFile, 'user_test-user-123/test.exe');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('is not supported');
    });

    it('should handle upload errors', async () => {
      mockUpload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' }
      });

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 });
      
      const result = await uploadFile(file, 'user_test-user-123/test.txt');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('listFiles', () => {
    it('should list files successfully', async () => {
      const files = await listFiles('user_test-user-123/house456');
      
      expect(files).toHaveLength(1);
      expect(files[0]).toEqual({
        name: 'test-file.txt',
        id: 'file-123',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: {},
        size: 1024
      });
    });

    it('should handle list errors', async () => {
      mockList.mockResolvedValueOnce({
        data: null,
        error: { message: 'List failed' }
      });

      await expect(listFiles('user_test-user-123/house456')).rejects.toThrow('Failed to list files: List failed');
    });
  });

  describe('downloadFile', () => {
    it('should download file successfully', async () => {
      const blob = await downloadFile('user_test-user-123/test.txt');
      
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle download errors', async () => {
      mockDownload.mockResolvedValueOnce({
        data: null,
        error: { message: 'Download failed' }
      });

      await expect(downloadFile('user_test-user-123/test.txt')).rejects.toThrow('Failed to download file: Download failed');
    });
  });

  describe('deleteFile', () => {
    it('should move file to archive instead of deleting', async () => {
      await deleteFile('user_test-user-123/test.txt');
      
      expect(mockMove).toHaveBeenCalled();
    });
  });

  describe('moveFile', () => {
    it('should move file successfully', async () => {
      await moveFile('user_test-user-123/old.txt', 'user_test-user-123/new.txt');
      
      expect(mockMove).toHaveBeenCalledWith('user_test-user-123/old.txt', 'user_test-user-123/new.txt');
    });

    it('should handle move errors', async () => {
      mockMove.mockResolvedValueOnce({
        error: { message: 'Move failed' }
      });

      await expect(moveFile('user_test-user-123/old.txt', 'user_test-user-123/new.txt')).rejects.toThrow('Failed to move file: Move failed');
    });
  });

  describe('createPlaceholder', () => {
    it('should create placeholder file', async () => {
      await createPlaceholder('user_test-user-123/empty-folder');
      
      expect(mockUpload).toHaveBeenCalled();
    });
  });

  describe('getFileUrl', () => {
    it('should get signed URL successfully', async () => {
      const url = await getFileUrl('user_test-user-123/test.txt');
      
      expect(url).toBe('https://example.com/signed-url');
    });

    it('should handle URL generation errors', async () => {
      mockCreateSignedUrl.mockResolvedValueOnce({
        data: null,
        error: { message: 'URL generation failed' }
      });

      await expect(getFileUrl('user_test-user-123/test.txt')).rejects.toThrow('Failed to get file URL: URL generation failed');
    });
  });

  describe('storageService object', () => {
    it('should export all service functions', () => {
      expect(storageService.uploadFile).toBeDefined();
      expect(storageService.listFiles).toBeDefined();
      expect(storageService.downloadFile).toBeDefined();
      expect(storageService.deleteFile).toBeDefined();
      expect(storageService.moveFile).toBeDefined();
      expect(storageService.createPlaceholder).toBeDefined();
      expect(storageService.getFileUrl).toBeDefined();
    });
  });
});