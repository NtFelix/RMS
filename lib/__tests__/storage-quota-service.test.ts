/**
 * Storage Quota Service Tests
 */

import { StorageQuotaService } from '@/lib/storage-quota-service';

// Mock all external dependencies
jest.mock('@/utils/supabase/client');
jest.mock('@/lib/supabase-server');
jest.mock('@/lib/data-fetching');
jest.mock('@/lib/cloud-storage-validation');

// Mock fetch for client-side subscription limits
global.fetch = jest.fn();

describe('StorageQuotaService', () => {
  let service: StorageQuotaService;

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

  it('should create StorageQuotaService instance', () => {
    service = new StorageQuotaService(false);
    expect(service).toBeInstanceOf(StorageQuotaService);
  });

  it('should create server StorageQuotaService instance', () => {
    service = new StorageQuotaService(true);
    expect(service).toBeInstanceOf(StorageQuotaService);
  });

  it('should have all required methods', () => {
    service = new StorageQuotaService(false);
    expect(typeof service.getUserStorageUsage).toBe('function');
    expect(typeof service.getStorageQuota).toBe('function');
    expect(typeof service.canUploadFiles).toBe('function');
    expect(typeof service.getQuotaStatus).toBe('function');
    expect(typeof service.enforceQuotaForUpload).toBe('function');
    expect(typeof service.getStorageUsageByEntity).toBe('function');
    expect(typeof service.shouldSuggestUpgrade).toBe('function');
  });
});