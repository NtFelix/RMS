/**
 * Tests for Folder Structure Service
 */

import { FolderNode } from '@/types/cloud-storage';
import { CloudStoragePaths, FolderStructureUtils } from '../cloud-storage-utils';

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
};

jest.mock('../supabase-server', () => ({
  createSupabaseServerClient: () => mockSupabaseClient,
}));

// Import after mocking
import { FolderStructureService } from '../folder-structure-service';

describe('FolderStructureService', () => {
  let service: FolderStructureService;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    service = new FolderStructureService();
    jest.clearAllMocks();
    
    // Reset mock implementation
    mockSupabaseClient.from.mockImplementation(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
        })),
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    }));
  });

  describe('initializeUserFolders', () => {
    it('should create default folder structure for new user', async () => {
      // Mock entity queries to return empty arrays
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'user_folder_structures') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
              })),
            })),
            upsert: jest.fn(() => Promise.resolve({ error: null })),
          };
        }
        // For entity tables
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ data: [] })),
          })),
        };
      });

      const result = await service.initializeUserFolders(mockUserId);

      expect(result).toHaveLength(4);
      expect(result.map(f => f.name)).toEqual(['Häuser', 'Wohnungen', 'Mieter', 'Sonstiges']);
      expect(result[0].type).toBe('category');
      expect(result[0].path).toBe(`${mockUserId}/haeuser`);
    });

  });

  describe('createEntityFolder', () => {
    it('should create folder for new entity', async () => {
      const result = await service.createEntityFolder(
        mockUserId,
        'haus',
        'house-123',
        'Mein Haus'
      );

      expect(result.name).toBe('Mein Haus');
      expect(result.type).toBe('entity');
      expect(result.entityType).toBe('haus');
      expect(result.entityId).toBe('house-123');
      expect(result.path).toBe(`${mockUserId}/haeuser/house-123`);
    });
  });

  describe('createCustomFolder', () => {
    it('should create custom folder with valid name', async () => {
      const result = await service.createCustomFolder(
        mockUserId,
        `${mockUserId}/sonstiges`,
        'Verträge'
      );

      expect(result.name).toBe('Verträge');
      expect(result.type).toBe('custom');
      expect(result.path).toBe(`${mockUserId}/sonstiges/Verträge`);
      expect(result.parentPath).toBe(`${mockUserId}/sonstiges`);
    });

    it('should reject invalid folder names', async () => {
      const invalidNames = ['', '   ', 'folder<name', 'CON'];

      for (const invalidName of invalidNames) {
        await expect(
          service.createCustomFolder(mockUserId, `${mockUserId}/sonstiges`, invalidName)
        ).rejects.toThrow('Failed to create folder');
      }
    });
  });

  describe('archiveEntityFolder', () => {
    it('should handle archiving entity folder gracefully', async () => {
      // Should not throw error
      await expect(
        service.archiveEntityFolder(mockUserId, 'haus', 'house-123')
      ).resolves.not.toThrow();
    });
  });
});