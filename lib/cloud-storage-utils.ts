/**
 * Cloud Storage Utility Functions
 * Path handling, file operations, and helper functions
 */

import { FolderNode, EntityFolder } from '@/types/cloud-storage';

/**
 * Path utilities for cloud storage
 */
export class CloudStoragePaths {
  /**
   * Generates user root path
   */
  static getUserRootPath(userId: string): string {
    return `${userId}`;
  }

  /**
   * Generates entity folder path
   */
  static getEntityFolderPath(
    userId: string, 
    entityType: 'haus' | 'wohnung' | 'mieter', 
    entityId: string
  ): string {
    const entityTypeFolder = {
      haus: 'haeuser',
      wohnung: 'wohnungen', 
      mieter: 'mieter'
    }[entityType];
    
    return `${userId}/${entityTypeFolder}/${entityId}`;
  }

  /**
   * Generates category folder path
   */
  static getCategoryFolderPath(userId: string, category: string): string {
    return `${userId}/${category}`;
  }

  /**
   * Generates custom folder path
   */
  static getCustomFolderPath(userId: string, parentPath: string, folderName: string): string {
    const cleanParentPath = parentPath.startsWith(userId) ? parentPath : `${userId}/${parentPath}`;
    return `${cleanParentPath}/${folderName}`;
  }

  /**
   * Extracts folder name from path
   */
  static getFolderNameFromPath(path: string): string {
    return path.split('/').pop() || '';
  }

  /**
   * Gets parent path from folder path
   */
  static getParentPath(path: string): string {
    const parts = path.split('/');
    return parts.slice(0, -1).join('/');
  }

  /**
   * Validates if path belongs to user
   */
  static isValidUserPath(path: string, userId: string): boolean {
    return path.startsWith(`${userId}/`) || path === userId;
  }

  /**
   * Normalizes path (removes double slashes, trailing slashes)
   */
  static normalizePath(path: string): string {
    return path
      .replace(/\/+/g, '/') // Replace multiple slashes with single slash
      .replace(/\/$/, '') // Remove trailing slash
      .replace(/^\//, ''); // Remove leading slash
  }
}

/**
 * Folder structure utilities
 */
export class FolderStructureUtils {
  /**
   * Creates default folder structure for new user
   */
  static createDefaultFolderStructure(userId: string): FolderNode[] {
    return [
      {
        id: `${userId}-haeuser`,
        name: 'Häuser',
        path: CloudStoragePaths.getCategoryFolderPath(userId, 'haeuser'),
        type: 'category',
        children: [],
        fileCount: 0,
        parentPath: userId,
      },
      {
        id: `${userId}-wohnungen`,
        name: 'Wohnungen',
        path: CloudStoragePaths.getCategoryFolderPath(userId, 'wohnungen'),
        type: 'category',
        children: [],
        fileCount: 0,
        parentPath: userId,
      },
      {
        id: `${userId}-mieter`,
        name: 'Mieter',
        path: CloudStoragePaths.getCategoryFolderPath(userId, 'mieter'),
        type: 'category',
        children: [],
        fileCount: 0,
        parentPath: userId,
      },
      {
        id: `${userId}-sonstiges`,
        name: 'Sonstiges',
        path: CloudStoragePaths.getCategoryFolderPath(userId, 'sonstiges'),
        type: 'category',
        children: [],
        fileCount: 0,
        parentPath: userId,
      },
    ];
  }

  /**
   * Creates entity folder node
   */
  static createEntityFolderNode(
    userId: string,
    entityType: 'haus' | 'wohnung' | 'mieter',
    entityId: string,
    entityName: string
  ): FolderNode {
    const path = CloudStoragePaths.getEntityFolderPath(userId, entityType, entityId);
    const parentPath = CloudStoragePaths.getCategoryFolderPath(userId, 
      entityType === 'haus' ? 'haeuser' : 
      entityType === 'wohnung' ? 'wohnungen' : 'mieter'
    );

    return {
      id: `${userId}-${entityType}-${entityId}`,
      name: entityName,
      path,
      type: 'entity',
      entityId,
      entityType,
      children: [],
      fileCount: 0,
      parentPath,
    };
  }

  /**
   * Finds folder node by path in tree
   */
  static findFolderByPath(tree: FolderNode[], path: string): FolderNode | null {
    for (const node of tree) {
      if (node.path === path) {
        return node;
      }
      
      const found = this.findFolderByPath(node.children, path);
      if (found) {
        return found;
      }
    }
    
    return null;
  }

  /**
   * Adds folder to tree structure
   */
  static addFolderToTree(tree: FolderNode[], folder: FolderNode): FolderNode[] {
    if (!folder.parentPath) {
      return [...tree, folder];
    }

    return tree.map(node => {
      if (node.path === folder.parentPath) {
        return {
          ...node,
          children: [...node.children, folder],
        };
      }
      
      return {
        ...node,
        children: this.addFolderToTree(node.children, folder),
      };
    });
  }

  /**
   * Removes folder from tree structure
   */
  static removeFolderFromTree(tree: FolderNode[], folderPath: string): FolderNode[] {
    return tree
      .filter(node => node.path !== folderPath)
      .map(node => ({
        ...node,
        children: this.removeFolderFromTree(node.children, folderPath),
      }));
  }

  /**
   * Updates file count for folder and its parents
   */
  static updateFileCount(tree: FolderNode[], folderPath: string, delta: number): FolderNode[] {
    return tree.map(node => {
      if (node.path === folderPath) {
        return {
          ...node,
          fileCount: Math.max(0, node.fileCount + delta),
        };
      }
      
      // Check if this folder is a parent of the target folder
      if (folderPath.startsWith(node.path + '/')) {
        return {
          ...node,
          fileCount: Math.max(0, node.fileCount + delta),
          children: this.updateFileCount(node.children, folderPath, delta),
        };
      }
      
      return {
        ...node,
        children: this.updateFileCount(node.children, folderPath, delta),
      };
    });
  }
}

/**
 * File operation utilities
 */
export class FileOperationUtils {
  /**
   * Generates breadcrumb navigation from path
   */
  static generateBreadcrumbs(path: string, userId: string): Array<{ name: string; path: string }> {
    const parts = path.split('/').filter(Boolean);
    const breadcrumbs: Array<{ name: string; path: string }> = [];
    
    // Add root
    breadcrumbs.push({ name: 'Dateien', path: userId });
    
    let currentPath = userId;
    for (let i = 1; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      
      // Translate category names
      let displayName = parts[i];
      if (parts[i] === 'haeuser') displayName = 'Häuser';
      else if (parts[i] === 'wohnungen') displayName = 'Wohnungen';
      else if (parts[i] === 'mieter') displayName = 'Mieter';
      else if (parts[i] === 'sonstiges') displayName = 'Sonstiges';
      
      breadcrumbs.push({ name: displayName, path: currentPath });
    }
    
    return breadcrumbs;
  }

  /**
   * Checks if file type supports preview
   */
  static supportsPreview(mimeType: string): boolean {
    return mimeType === 'application/pdf' || mimeType.startsWith('image/');
  }

  /**
   * Gets appropriate icon for file type
   */
  static getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'file-text';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'file-text';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table';
    if (mimeType.startsWith('text/')) return 'file-text';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
    return 'file';
  }

  /**
   * Sorts files by specified criteria
   */
  static sortFiles<T extends { name: string; size: number; uploadedAt: string; mimeType: string }>(
    files: T[],
    sortBy: 'name' | 'size' | 'uploadedAt' | 'type',
    sortOrder: 'asc' | 'desc' = 'asc'
  ): T[] {
    const sorted = [...files].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'uploadedAt':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'type':
          comparison = a.mimeType.localeCompare(b.mimeType);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  }

  /**
   * Filters files by search criteria
   */
  static filterFiles<T extends { name: string; mimeType: string; entityType?: string; entityId?: string }>(
    files: T[],
    searchQuery?: string,
    fileType?: string,
    entityType?: string,
    entityId?: string
  ): T[] {
    return files.filter(file => {
      // Search query filter
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // File type filter
      if (fileType && !file.mimeType.includes(fileType)) {
        return false;
      }
      
      // Entity type filter
      if (entityType && file.entityType !== entityType) {
        return false;
      }
      
      // Entity ID filter
      if (entityId && file.entityId !== entityId) {
        return false;
      }
      
      return true;
    });
  }
}