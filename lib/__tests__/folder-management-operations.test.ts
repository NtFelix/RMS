/**
 * Tests for folder management operations
 * Covers folder creation, deletion, renaming, moving, and tree traversal
 */

import { FolderStructureService } from '@/lib/folder-structure-service';
import { FolderStructureUtils, CloudStoragePaths } from '@/lib/cloud-storage-utils';
import { FolderNode } from '@/types/cloud-storage';

// Mock Supabase
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: () => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      upsert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  })
}));

describe('FolderStructureService - Folder Management Operations', () => {
  let service: FolderStructureService;
  const userId = 'test-user-123';

  beforeEach(() => {
    service = new FolderStructureService();
    jest.clearAllMocks();
  });

  describe('renameFolder', () => {
    it('should rename a custom folder successfully', async () => {
      // Mock existing folder structure
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Old Name',
              path: `${userId}/sonstiges/old-name`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      // Mock getFolderTree to return our test structure
      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);
      jest.spyOn(service as any, 'storeFolderStructure').mockResolvedValue(undefined);

      const result = await service.renameFolder(
        userId,
        `${userId}/sonstiges/old-name`,
        'New Name'
      );

      expect(result.name).toBe('New Name');
      expect(result.path).toBe(`${userId}/sonstiges/New Name`);
    });

    it('should prevent renaming category folders', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.renameFolder(userId, `${userId}/sonstiges`, 'New Name')
      ).rejects.toThrow('Cannot rename system folders');
    });

    it('should prevent renaming entity folders', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-haus-123`,
          name: 'Test House',
          path: `${userId}/haeuser/123`,
          type: 'entity',
          entityId: '123',
          entityType: 'haus',
          children: [],
          fileCount: 0,
          parentPath: `${userId}/haeuser`,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.renameFolder(userId, `${userId}/haeuser/123`, 'New Name')
      ).rejects.toThrow('Cannot rename system folders');
    });

    it('should prevent duplicate names in same parent', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Folder 1',
              path: `${userId}/sonstiges/folder-1`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            },
            {
              id: `${userId}-custom-2`,
              name: 'Folder 2',
              path: `${userId}/sonstiges/folder-2`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.renameFolder(userId, `${userId}/sonstiges/folder-1`, 'Folder 2')
      ).rejects.toThrow('A folder with this name already exists');
    });
  });

  describe('moveFolder', () => {
    it('should move a custom folder successfully', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Folder to Move',
              path: `${userId}/sonstiges/folder-to-move`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        },
        {
          id: `${userId}-haeuser`,
          name: 'Häuser',
          path: `${userId}/haeuser`,
          type: 'category',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);
      jest.spyOn(service as any, 'storeFolderStructure').mockResolvedValue(undefined);

      const result = await service.moveFolder(
        userId,
        `${userId}/sonstiges/folder-to-move`,
        `${userId}/haeuser`
      );

      expect(result.parentPath).toBe(`${userId}/haeuser`);
      expect(result.path).toBe(`${userId}/haeuser/Folder to Move`);
    });

    it('should prevent moving to self', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-custom-1`,
          name: 'Test Folder',
          path: `${userId}/sonstiges/test-folder`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: `${userId}/sonstiges`,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.moveFolder(
          userId,
          `${userId}/sonstiges/test-folder`,
          `${userId}/sonstiges/test-folder`
        )
      ).rejects.toThrow('Cannot move folder to itself or its descendant');
    });

    it('should prevent moving to descendant', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-custom-1`,
          name: 'Parent Folder',
          path: `${userId}/sonstiges/parent`,
          type: 'custom',
          children: [
            {
              id: `${userId}-custom-2`,
              name: 'Child Folder',
              path: `${userId}/sonstiges/parent/child`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges/parent`,
            }
          ],
          fileCount: 0,
          parentPath: `${userId}/sonstiges`,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.moveFolder(
          userId,
          `${userId}/sonstiges/parent`,
          `${userId}/sonstiges/parent/child`
        )
      ).rejects.toThrow('Cannot move folder to itself or its descendant');
    });
  });

  describe('deleteFolder', () => {
    it('should delete empty custom folder successfully', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Empty Folder',
              path: `${userId}/sonstiges/empty-folder`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);
      jest.spyOn(service as any, 'storeFolderStructure').mockResolvedValue(undefined);

      await expect(
        service.deleteFolder(userId, `${userId}/sonstiges/empty-folder`)
      ).resolves.not.toThrow();
    });

    it('should prevent deleting category folders', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.deleteFolder(userId, `${userId}/sonstiges`)
      ).rejects.toThrow('Cannot delete category folders');
    });

    it('should prevent deleting non-empty folders', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-custom-1`,
          name: 'Non-empty Folder',
          path: `${userId}/sonstiges/non-empty`,
          type: 'custom',
          children: [],
          fileCount: 5, // Has files
          parentPath: `${userId}/sonstiges`,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      await expect(
        service.deleteFolder(userId, `${userId}/sonstiges/non-empty`)
      ).rejects.toThrow('Cannot delete non-empty folder');
    });
  });

  describe('getSubfolders', () => {
    it('should return subfolders for a given path', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Subfolder 1',
              path: `${userId}/sonstiges/subfolder-1`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            },
            {
              id: `${userId}-custom-2`,
              name: 'Subfolder 2',
              path: `${userId}/sonstiges/subfolder-2`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      const subfolders = await service.getSubfolders(userId, `${userId}/sonstiges`);

      expect(subfolders).toHaveLength(2);
      expect(subfolders[0].name).toBe('Subfolder 1');
      expect(subfolders[1].name).toBe('Subfolder 2');
    });
  });

  describe('getFolderHierarchy', () => {
    it('should return folder hierarchy from root to target', async () => {
      const mockTree: FolderNode[] = [
        {
          id: `${userId}-sonstiges`,
          name: 'Sonstiges',
          path: `${userId}/sonstiges`,
          type: 'category',
          children: [
            {
              id: `${userId}-custom-1`,
              name: 'Level 1',
              path: `${userId}/sonstiges/level-1`,
              type: 'custom',
              children: [
                {
                  id: `${userId}-custom-2`,
                  name: 'Level 2',
                  path: `${userId}/sonstiges/level-1/level-2`,
                  type: 'custom',
                  children: [],
                  fileCount: 0,
                  parentPath: `${userId}/sonstiges/level-1`,
                }
              ],
              fileCount: 0,
              parentPath: `${userId}/sonstiges`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      jest.spyOn(service, 'getFolderTree').mockResolvedValue(mockTree);

      const hierarchy = await service.getFolderHierarchy(
        userId,
        `${userId}/sonstiges/level-1/level-2`
      );

      expect(hierarchy).toHaveLength(3);
      expect(hierarchy[0].name).toBe('Sonstiges');
      expect(hierarchy[1].name).toBe('Level 1');
      expect(hierarchy[2].name).toBe('Level 2');
    });
  });
});

describe('FolderStructureUtils - Tree Operations', () => {
  const userId = 'test-user-123';

  describe('renameFolderInTree', () => {
    it('should rename folder and update child paths', () => {
      const tree: FolderNode[] = [
        {
          id: 'folder-1',
          name: 'Old Name',
          path: `${userId}/old-name`,
          type: 'custom',
          children: [
            {
              id: 'child-1',
              name: 'Child',
              path: `${userId}/old-name/child`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/old-name`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const result = FolderStructureUtils.renameFolderInTree(
        tree,
        `${userId}/old-name`,
        'New Name',
        `${userId}/new-name`
      );

      expect(result[0].name).toBe('New Name');
      expect(result[0].path).toBe(`${userId}/new-name`);
      expect(result[0].children[0].path).toBe(`${userId}/new-name/child`);
    });
  });

  describe('moveFolderInTree', () => {
    it('should move folder to new parent', () => {
      const tree: FolderNode[] = [
        {
          id: 'parent-1',
          name: 'Parent 1',
          path: `${userId}/parent-1`,
          type: 'custom',
          children: [
            {
              id: 'folder-to-move',
              name: 'Folder to Move',
              path: `${userId}/parent-1/folder-to-move`,
              type: 'custom',
              children: [],
              fileCount: 0,
              parentPath: `${userId}/parent-1`,
            }
          ],
          fileCount: 0,
          parentPath: userId,
        },
        {
          id: 'parent-2',
          name: 'Parent 2',
          path: `${userId}/parent-2`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const result = FolderStructureUtils.moveFolderInTree(
        tree,
        `${userId}/parent-1/folder-to-move`,
        `${userId}/parent-2`,
        `${userId}/parent-2/folder-to-move`
      );

      // Check that folder was removed from parent-1
      expect(result[0].children).toHaveLength(0);
      
      // Check that folder was added to parent-2
      expect(result[1].children).toHaveLength(1);
      expect(result[1].children[0].name).toBe('Folder to Move');
      expect(result[1].children[0].parentPath).toBe(`${userId}/parent-2`);
    });
  });

  describe('searchFolders', () => {
    it('should find folders matching search query', () => {
      const tree: FolderNode[] = [
        {
          id: 'folder-1',
          name: 'Test Folder',
          path: `${userId}/test-folder`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        },
        {
          id: 'folder-2',
          name: 'Another Folder',
          path: `${userId}/another-folder`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const results = FolderStructureUtils.searchFolders(tree, 'test');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Test Folder');
    });

    it('should support case-sensitive search', () => {
      const tree: FolderNode[] = [
        {
          id: 'folder-1',
          name: 'Test Folder',
          path: `${userId}/test-folder`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const results = FolderStructureUtils.searchFolders(tree, 'test', {
        caseSensitive: true
      });

      expect(results).toHaveLength(0); // Should not match 'Test' with 'test'
    });
  });

  describe('validateTreeStructure', () => {
    it('should validate correct tree structure', () => {
      const tree: FolderNode[] = [
        {
          id: 'folder-1',
          name: 'Valid Folder',
          path: `${userId}/valid-folder`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const result = FolderStructureUtils.validateTreeStructure(tree, userId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect duplicate paths', () => {
      const tree: FolderNode[] = [
        {
          id: 'folder-1',
          name: 'Folder 1',
          path: `${userId}/duplicate`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        },
        {
          id: 'folder-2',
          name: 'Folder 2',
          path: `${userId}/duplicate`,
          type: 'custom',
          children: [],
          fileCount: 0,
          parentPath: userId,
        }
      ];

      const result = FolderStructureUtils.validateTreeStructure(tree, userId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Duplicate path found: ${userId}/duplicate`);
    });
  });
});

describe('CloudStoragePaths - Path Resolution', () => {
  describe('resolvePath', () => {
    it('should resolve relative paths correctly', () => {
      const result = CloudStoragePaths.resolvePath('user/folder', 'subfolder');
      expect(result).toBe('user/folder/subfolder');
    });

    it('should handle absolute paths', () => {
      const result = CloudStoragePaths.resolvePath('user/folder', '/absolute/path');
      expect(result).toBe('absolute/path');
    });
  });

  describe('getRelativePath', () => {
    it('should calculate relative path between folders', () => {
      const result = CloudStoragePaths.getRelativePath(
        'user/folder1',
        'user/folder2/subfolder'
      );
      expect(result).toBe('../folder2/subfolder');
    });

    it('should handle same folder', () => {
      const result = CloudStoragePaths.getRelativePath('user/folder', 'user/folder');
      expect(result).toBe('.');
    });
  });

  describe('isDescendantOf', () => {
    it('should detect descendant paths', () => {
      const result = CloudStoragePaths.isDescendantOf(
        'user/parent/child',
        'user/parent'
      );
      expect(result).toBe(true);
    });

    it('should not consider same path as descendant', () => {
      const result = CloudStoragePaths.isDescendantOf('user/folder', 'user/folder');
      expect(result).toBe(false);
    });
  });

  describe('isValidFolderName', () => {
    it('should accept valid folder names', () => {
      expect(CloudStoragePaths.isValidFolderName('Valid Folder')).toBe(true);
      expect(CloudStoragePaths.isValidFolderName('folder-123')).toBe(true);
      expect(CloudStoragePaths.isValidFolderName('Folder_Name')).toBe(true);
    });

    it('should reject invalid folder names', () => {
      expect(CloudStoragePaths.isValidFolderName('')).toBe(false);
      expect(CloudStoragePaths.isValidFolderName('folder/name')).toBe(false);
      expect(CloudStoragePaths.isValidFolderName('CON')).toBe(false);
      expect(CloudStoragePaths.isValidFolderName(' folder')).toBe(false);
      expect(CloudStoragePaths.isValidFolderName('folder ')).toBe(false);
      expect(CloudStoragePaths.isValidFolderName('.folder')).toBe(false);
    });
  });
});