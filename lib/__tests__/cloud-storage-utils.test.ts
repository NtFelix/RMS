/**
 * Tests for cloud storage utility functions
 */

import {
  CloudStoragePaths,
  FolderStructureUtils,
  FileOperationUtils,
} from '../cloud-storage-utils';
import { FolderNode } from '@/types/cloud-storage';

describe('Cloud Storage Utils', () => {
  const userId = 'test-user-123';

  describe('CloudStoragePaths', () => {
    it('should generate user root path', () => {
      const path = CloudStoragePaths.getUserRootPath(userId);
      expect(path).toBe('test-user-123');
    });

    it('should generate entity folder paths', () => {
      expect(CloudStoragePaths.getEntityFolderPath(userId, 'haus', 'house-1'))
        .toBe('test-user-123/haeuser/house-1');
      expect(CloudStoragePaths.getEntityFolderPath(userId, 'wohnung', 'apt-1'))
        .toBe('test-user-123/wohnungen/apt-1');
      expect(CloudStoragePaths.getEntityFolderPath(userId, 'mieter', 'tenant-1'))
        .toBe('test-user-123/mieter/tenant-1');
    });

    it('should generate category folder paths', () => {
      const path = CloudStoragePaths.getCategoryFolderPath(userId, 'sonstiges');
      expect(path).toBe('test-user-123/sonstiges');
    });

    it('should generate custom folder paths', () => {
      const path = CloudStoragePaths.getCustomFolderPath(userId, 'sonstiges', 'Verträge');
      expect(path).toBe('test-user-123/sonstiges/Verträge');
    });

    it('should extract folder name from path', () => {
      const name = CloudStoragePaths.getFolderNameFromPath('test-user-123/haeuser/house-1');
      expect(name).toBe('house-1');
    });

    it('should get parent path', () => {
      const parent = CloudStoragePaths.getParentPath('test-user-123/haeuser/house-1');
      expect(parent).toBe('test-user-123/haeuser');
    });

    it('should validate user paths', () => {
      expect(CloudStoragePaths.isValidUserPath('test-user-123/haeuser', userId)).toBe(true);
      expect(CloudStoragePaths.isValidUserPath('test-user-123', userId)).toBe(true);
      expect(CloudStoragePaths.isValidUserPath('other-user/haeuser', userId)).toBe(false);
    });

    it('should normalize paths', () => {
      expect(CloudStoragePaths.normalizePath('/test//path/')).toBe('test/path');
      expect(CloudStoragePaths.normalizePath('test/path/')).toBe('test/path');
      expect(CloudStoragePaths.normalizePath('/test/path')).toBe('test/path');
    });
  });

  describe('FolderStructureUtils', () => {
    it('should create default folder structure', () => {
      const structure = FolderStructureUtils.createDefaultFolderStructure(userId);
      
      expect(structure).toHaveLength(4);
      expect(structure.map(f => f.name)).toEqual(['Häuser', 'Wohnungen', 'Mieter', 'Sonstiges']);
      expect(structure[0].type).toBe('category');
      expect(structure[0].path).toBe('test-user-123/haeuser');
    });

    it('should create entity folder node', () => {
      const folder = FolderStructureUtils.createEntityFolderNode(
        userId, 
        'haus', 
        'house-1', 
        'Musterstraße 1'
      );
      
      expect(folder.name).toBe('Musterstraße 1');
      expect(folder.type).toBe('entity');
      expect(folder.entityType).toBe('haus');
      expect(folder.entityId).toBe('house-1');
      expect(folder.path).toBe('test-user-123/haeuser/house-1');
    });

    it('should find folder by path in tree', () => {
      const tree: FolderNode[] = [
        {
          id: '1',
          name: 'Root',
          path: 'test-user-123/root',
          type: 'category',
          children: [
            {
              id: '2',
              name: 'Child',
              path: 'test-user-123/root/child',
              type: 'custom',
              children: [],
              fileCount: 0,
            }
          ],
          fileCount: 0,
        }
      ];
      
      const found = FolderStructureUtils.findFolderByPath(tree, 'test-user-123/root/child');
      expect(found?.name).toBe('Child');
      
      const notFound = FolderStructureUtils.findFolderByPath(tree, 'nonexistent');
      expect(notFound).toBeNull();
    });

    it('should add folder to tree', () => {
      const tree: FolderNode[] = [
        {
          id: '1',
          name: 'Root',
          path: 'test-user-123/root',
          type: 'category',
          children: [],
          fileCount: 0,
        }
      ];
      
      const newFolder: FolderNode = {
        id: '2',
        name: 'New Folder',
        path: 'test-user-123/root/new',
        type: 'custom',
        children: [],
        fileCount: 0,
        parentPath: 'test-user-123/root',
      };
      
      const updatedTree = FolderStructureUtils.addFolderToTree(tree, newFolder);
      expect(updatedTree[0].children).toHaveLength(1);
      expect(updatedTree[0].children[0].name).toBe('New Folder');
    });

    it('should remove folder from tree', () => {
      const tree: FolderNode[] = [
        {
          id: '1',
          name: 'Root',
          path: 'test-user-123/root',
          type: 'category',
          children: [
            {
              id: '2',
              name: 'To Remove',
              path: 'test-user-123/root/remove',
              type: 'custom',
              children: [],
              fileCount: 0,
            }
          ],
          fileCount: 0,
        }
      ];
      
      const updatedTree = FolderStructureUtils.removeFolderFromTree(tree, 'test-user-123/root/remove');
      expect(updatedTree[0].children).toHaveLength(0);
    });

    it('should update file count', () => {
      const tree: FolderNode[] = [
        {
          id: '1',
          name: 'Root',
          path: 'test-user-123/root',
          type: 'category',
          children: [
            {
              id: '2',
              name: 'Child',
              path: 'test-user-123/root/child',
              type: 'custom',
              children: [],
              fileCount: 0,
            }
          ],
          fileCount: 0,
        }
      ];
      
      const updatedTree = FolderStructureUtils.updateFileCount(tree, 'test-user-123/root/child', 2);
      expect(updatedTree[0].fileCount).toBe(2); // Parent updated
      expect(updatedTree[0].children[0].fileCount).toBe(2); // Target updated
    });
  });

  describe('FileOperationUtils', () => {
    it('should generate breadcrumbs', () => {
      const breadcrumbs = FileOperationUtils.generateBreadcrumbs(
        'test-user-123/haeuser/house-1', 
        userId
      );
      
      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0]).toEqual({ name: 'Dateien', path: 'test-user-123' });
      expect(breadcrumbs[1]).toEqual({ name: 'Häuser', path: 'test-user-123/haeuser' });
      expect(breadcrumbs[2]).toEqual({ name: 'house-1', path: 'test-user-123/haeuser/house-1' });
    });

    it('should check preview support', () => {
      expect(FileOperationUtils.supportsPreview('application/pdf')).toBe(true);
      expect(FileOperationUtils.supportsPreview('image/jpeg')).toBe(true);
      expect(FileOperationUtils.supportsPreview('application/msword')).toBe(false);
    });

    it('should get file icons', () => {
      expect(FileOperationUtils.getFileIcon('image/jpeg')).toBe('image');
      expect(FileOperationUtils.getFileIcon('application/pdf')).toBe('file-text');
      expect(FileOperationUtils.getFileIcon('application/zip')).toBe('archive');
      expect(FileOperationUtils.getFileIcon('unknown/type')).toBe('file');
    });

    it('should sort files', () => {
      const files = [
        { name: 'z.pdf', size: 100, uploadedAt: '2023-01-01', mimeType: 'application/pdf' },
        { name: 'a.pdf', size: 200, uploadedAt: '2023-01-02', mimeType: 'application/pdf' },
      ];
      
      const sortedByName = FileOperationUtils.sortFiles(files, 'name', 'asc');
      expect(sortedByName[0].name).toBe('a.pdf');
      
      const sortedBySize = FileOperationUtils.sortFiles(files, 'size', 'desc');
      expect(sortedBySize[0].size).toBe(200);
    });

    it('should filter files', () => {
      const files = [
        { name: 'test.pdf', mimeType: 'application/pdf', entityType: 'haus' as const, entityId: '1' },
        { name: 'image.jpg', mimeType: 'image/jpeg', entityType: 'mieter' as const, entityId: '2' },
        { name: 'document.docx', mimeType: 'application/msword', entityType: 'haus' as const, entityId: '1' },
      ];
      
      const filtered = FileOperationUtils.filterFiles(files, 'test', undefined, 'haus');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('test.pdf');
    });
  });
});