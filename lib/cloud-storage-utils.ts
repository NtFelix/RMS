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

  /**
   * Resolves relative path against a base path
   */
  static resolvePath(basePath: string, relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return this.normalizePath(relativePath);
    }

    const normalizedBase = this.normalizePath(basePath);
    const normalizedRelative = this.normalizePath(relativePath);

    if (!normalizedRelative) {
      return normalizedBase;
    }

    return this.normalizePath(`${normalizedBase}/${normalizedRelative}`);
  }

  /**
   * Gets relative path from one folder to another
   */
  static getRelativePath(fromPath: string, toPath: string): string {
    const fromParts = this.normalizePath(fromPath).split('/');
    const toParts = this.normalizePath(toPath).split('/');

    // Find common prefix
    let commonLength = 0;
    while (
      commonLength < fromParts.length &&
      commonLength < toParts.length &&
      fromParts[commonLength] === toParts[commonLength]
    ) {
      commonLength++;
    }

    // Build relative path
    const upLevels = fromParts.length - commonLength;
    const downPath = toParts.slice(commonLength);

    const relativeParts = Array(upLevels).fill('..').concat(downPath);
    return relativeParts.join('/') || '.';
  }

  /**
   * Checks if a path is a descendant of another path
   */
  static isDescendantOf(childPath: string, parentPath: string): boolean {
    const normalizedChild = this.normalizePath(childPath);
    const normalizedParent = this.normalizePath(parentPath);

    if (normalizedChild === normalizedParent) {
      return false; // Same path, not descendant
    }

    return normalizedChild.startsWith(normalizedParent + '/');
  }

  /**
   * Gets the depth of a path (number of levels from root)
   */
  static getPathDepth(path: string): number {
    const normalized = this.normalizePath(path);
    if (!normalized) return 0;
    return normalized.split('/').length;
  }

  /**
   * Joins multiple path segments safely
   */
  static joinPaths(...segments: string[]): string {
    return this.normalizePath(segments.filter(Boolean).join('/'));
  }

  /**
   * Validates folder name for invalid characters and reserved names
   */
  static isValidFolderName(name: string): boolean {
    // Check for empty name
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(name)) {
      return false;
    }

    // Check for reserved names (Windows)
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];
    if (reservedNames.includes(name.toUpperCase())) {
      return false;
    }

    // Check for names that start or end with spaces or dots
    if (name.startsWith(' ') || name.endsWith(' ') || name.startsWith('.') || name.endsWith('.')) {
      return false;
    }

    // Check length (most filesystems support up to 255 characters)
    if (name.length > 255) {
      return false;
    }

    return true;
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

  /**
   * Renames a folder and updates all child paths recursively
   */
  static renameFolderInTree(
    tree: FolderNode[],
    oldPath: string,
    newName: string,
    newPath: string
  ): FolderNode[] {
    return tree.map(node => {
      if (node.path === oldPath) {
        // Update the folder itself
        const updatedNode = {
          ...node,
          name: newName,
          path: newPath,
        };
        
        // Update all child paths recursively
        updatedNode.children = this.updateChildPaths(node.children, oldPath, newPath);
        
        return updatedNode;
      }
      
      return {
        ...node,
        children: this.renameFolderInTree(node.children, oldPath, newName, newPath),
      };
    });
  }

  /**
   * Moves a folder from one parent to another
   */
  static moveFolderInTree(
    tree: FolderNode[],
    folderPath: string,
    newParentPath: string,
    newPath: string
  ): FolderNode[] {
    // First, find and remove the folder from its current location
    let folderToMove: FolderNode | null = null;
    
    const treeWithoutFolder = tree
      .map(node => {
        if (node.path === folderPath) {
          folderToMove = { ...node, path: newPath, parentPath: newParentPath };
          return null; // Mark for removal
        }
        
        const childResult = this.extractFolderFromTree(node.children, folderPath);
        if (childResult.folder) {
          folderToMove = { ...childResult.folder, path: newPath, parentPath: newParentPath };
          return {
            ...node,
            children: childResult.remainingTree,
          };
        }
        
        return node;
      })
      .filter(Boolean) as FolderNode[];

    if (!folderToMove) {
      throw new Error('Folder to move not found');
    }

    // Update all child paths in the moved folder
    folderToMove.children = this.updateChildPaths(folderToMove.children, folderPath, newPath);

    // Add the folder to its new parent location
    return this.addFolderToTree(treeWithoutFolder, folderToMove);
  }

  /**
   * Extracts a folder from tree and returns both the folder and remaining tree
   */
  private static extractFolderFromTree(
    tree: FolderNode[],
    folderPath: string
  ): { folder: FolderNode | null; remainingTree: FolderNode[] } {
    let extractedFolder: FolderNode | null = null;
    
    const remainingTree = tree
      .map(node => {
        if (node.path === folderPath) {
          extractedFolder = node;
          return null; // Mark for removal
        }
        
        const childResult = this.extractFolderFromTree(node.children, folderPath);
        if (childResult.folder) {
          extractedFolder = childResult.folder;
          return {
            ...node,
            children: childResult.remainingTree,
          };
        }
        
        return node;
      })
      .filter(Boolean) as FolderNode[];

    return { folder: extractedFolder, remainingTree };
  }

  /**
   * Updates all child paths when a parent folder is moved or renamed
   */
  private static updateChildPaths(
    children: FolderNode[],
    oldParentPath: string,
    newParentPath: string
  ): FolderNode[] {
    return children.map(child => {
      const newChildPath = child.path.replace(oldParentPath, newParentPath);
      
      return {
        ...child,
        path: newChildPath,
        parentPath: newParentPath,
        children: this.updateChildPaths(child.children, child.path, newChildPath),
      };
    });
  }

  /**
   * Gets the full hierarchy path for a folder (from root to target)
   */
  static getFolderHierarchy(tree: FolderNode[], targetPath: string): FolderNode[] {
    const hierarchy: FolderNode[] = [];
    
    const findPath = (nodes: FolderNode[], path: string): boolean => {
      for (const node of nodes) {
        if (node.path === path) {
          hierarchy.push(node);
          return true;
        }
        
        if (path.startsWith(node.path + '/')) {
          hierarchy.push(node);
          if (findPath(node.children, path)) {
            return true;
          }
          hierarchy.pop(); // Remove if not found in children
        }
      }
      return false;
    };

    findPath(tree, targetPath);
    return hierarchy;
  }

  /**
   * Finds all folders matching a search criteria
   */
  static searchFolders(
    tree: FolderNode[],
    searchQuery: string,
    options: {
      caseSensitive?: boolean;
      exactMatch?: boolean;
      includeEntityFolders?: boolean;
    } = {}
  ): FolderNode[] {
    const {
      caseSensitive = false,
      exactMatch = false,
      includeEntityFolders = true,
    } = options;

    const results: FolderNode[] = [];
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

    const searchRecursive = (nodes: FolderNode[]) => {
      for (const node of nodes) {
        // Skip entity folders if not included
        if (!includeEntityFolders && node.type === 'entity') {
          continue;
        }

        const nodeName = caseSensitive ? node.name : node.name.toLowerCase();
        const matches = exactMatch 
          ? nodeName === query
          : nodeName.includes(query);

        if (matches) {
          results.push(node);
        }

        // Search children
        searchRecursive(node.children);
      }
    };

    searchRecursive(tree);
    return results;
  }

  /**
   * Gets folder statistics (total folders, files, size)
   */
  static getFolderStats(tree: FolderNode[]): {
    totalFolders: number;
    totalFiles: number;
    maxDepth: number;
  } {
    let totalFolders = 0;
    let totalFiles = 0;
    let maxDepth = 0;

    const calculateStats = (nodes: FolderNode[], depth: number = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      
      for (const node of nodes) {
        totalFolders++;
        totalFiles += node.fileCount;
        
        if (node.children.length > 0) {
          calculateStats(node.children, depth + 1);
        }
      }
    };

    calculateStats(tree);
    
    return {
      totalFolders,
      totalFiles,
      maxDepth,
    };
  }

  /**
   * Validates folder tree structure integrity
   */
  static validateTreeStructure(tree: FolderNode[], userId: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const seenPaths = new Set<string>();

    const validateRecursive = (nodes: FolderNode[], parentPath?: string) => {
      for (const node of nodes) {
        // Check for duplicate paths
        if (seenPaths.has(node.path)) {
          errors.push(`Duplicate path found: ${node.path}`);
        }
        seenPaths.add(node.path);

        // Check path validity
        if (!CloudStoragePaths.isValidUserPath(node.path, userId)) {
          errors.push(`Invalid path for user: ${node.path}`);
        }

        // Check parent path consistency
        if (parentPath && node.parentPath !== parentPath) {
          errors.push(`Inconsistent parent path for ${node.path}: expected ${parentPath}, got ${node.parentPath}`);
        }

        // Check file count is non-negative
        if (node.fileCount < 0) {
          errors.push(`Negative file count for ${node.path}: ${node.fileCount}`);
        }

        // Validate children
        if (node.children.length > 0) {
          validateRecursive(node.children, node.path);
        }
      }
    };

    validateRecursive(tree);

    return {
      isValid: errors.length === 0,
      errors,
    };
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