/**
 * File Storage Service Tests
 */

import { FileStorageService } from '@/lib/file-storage-service';

// Mock all external dependencies
jest.mock('@/utils/supabase/client');
jest.mock('@/lib/supabase-server');
jest.mock('@/lib/data-fetching');
jest.mock('@/lib/cloud-storage-validation');
jest.mock('@/lib/cloud-storage-utils');
jest.mock('@/lib/cloud-storage-constants');

// Mock fetch for client-side subscription limits
global.fetch = jest.fn();

describe('FileStorageService', () => {
  let service: FileStorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for subscription limits
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        maxStorageBytes: 100 * 1024 * 1024,
        maxFileSize: 10 * 1024 * 1024,
        allowedFileTypes: ['application/pdf', 'image/jpeg'],
        canShare: false,
        canBulkOperations: false,
      }),
    });
  });

  it('should create FileStorageService instance', () => {
    service = new FileStorageService(false);
    expect(service).toBeInstanceOf(FileStorageService);
  });

  it('should create server FileStorageService instance', () => {
    service = new FileStorageService(true);
    expect(service).toBeInstanceOf(FileStorageService);
  });

  it('should have all required methods', () => {
    service = new FileStorageService(false);
    expect(typeof service.uploadFile).toBe('function');
    expect(typeof service.downloadFile).toBe('function');
    expect(typeof service.deleteFile).toBe('function');
    expect(typeof service.moveFile).toBe('function');
    expect(typeof service.renameFile).toBe('function');
    expect(typeof service.getUserStorageUsage).toBe('function');
    expect(typeof service.searchFiles).toBe('function');
  });
});