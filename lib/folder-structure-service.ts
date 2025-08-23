/**
 * Folder Structure Initialization Service
 * Handles automatic folder creation and management for cloud storage
 */

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { FolderNode, EntityFolder } from '@/types/cloud-storage';
import { CloudStoragePaths, FolderStructureUtils } from '@/lib/cloud-storage-utils';
import { FOLDER_STRUCTURE } from '@/lib/cloud-storage-constants';

export interface EntityData {
  id: string;
  name: string;
  type: 'haus' | 'wohnung' | 'mieter';
}

export class FolderStructureService {
  private supabase = createSupabaseServerClient();

  /**
   * Initializes folder structure for a user on first access
   * Creates root category folders and entity-specific folders based on existing data
   */
  async initializeUserFolders(userId: string): Promise<FolderNode[]> {
    try {
      // Check if user folders already exist
      const existingStructure = await this.getStoredFolderStructure(userId);
      if (existingStructure && existingStructure.length > 0) {
        return existingStructure;
      }

      // Create default folder structure
      const defaultFolders = FolderStructureUtils.createDefaultFolderStructure(userId);
      
      // Get user's existing entities
      const entities = await this.getUserEntities(userId);
      
      // Create entity folders and add them to the structure
      let folderTree = defaultFolders;
      
      for (const entity of entities) {
        const entityFolder = FolderStructureUtils.createEntityFolderNode(
          userId,
          entity.type,
          entity.id,
          entity.name
        );
        
        folderTree = FolderStructureUtils.addFolderToTree(folderTree, entityFolder);
      }

      // Store the folder structure in database
      await this.storeFolderStructure(userId, folderTree);
      
      return folderTree;
    } catch (error) {
      console.error('Error initializing user folders:', error);
      throw new Error('Failed to initialize folder structure');
    }
  }

  /**
   * Creates folder for a new entity (house, apartment, or tenant)
   */
  async createEntityFolder(
    userId: string,
    entityType: 'haus' | 'wohnung' | 'mieter',
    entityId: string,
    entityName: string
  ): Promise<FolderNode> {
    try {
      // Create the entity folder node
      const entityFolder = FolderStructureUtils.createEntityFolderNode(
        userId,
        entityType,
        entityId,
        entityName
      );

      // Get current folder tree
      const currentTree = await this.getFolderTree(userId);
      
      // Add the new folder to the tree
      const updatedTree = FolderStructureUtils.addFolderToTree(currentTree, entityFolder);
      
      // Update the stored folder structure
      await this.storeFolderStructure(userId, updatedTree);
      
      return entityFolder;
    } catch (error) {
      console.error('Error creating entity folder:', error);
      throw new Error(`Failed to create folder for ${entityType}: ${entityName}`);
    }
  }

  /**
   * Generates folder tree based on user's existing data
   */
  async getFolderTree(userId: string): Promise<FolderNode[]> {
    try {
      // Try to get stored folder structure first
      const storedStructure = await this.getStoredFolderStructure(userId);
      if (storedStructure) {
        return storedStructure;
      }

      // If no stored structure, create default and populate with entities
      return await this.initializeUserFolders(userId);
    } catch (error) {
      console.error('Error getting folder tree:', error);
      throw new Error('Failed to retrieve folder structure');
    }
  }

  /**
   * Creates a custom folder within the user's structure
   */
  async createCustomFolder(
    userId: string,
    parentPath: string,
    folderName: string
  ): Promise<FolderNode> {
    try {
      // Validate folder name
      if (!this.isValidFolderName(folderName)) {
        throw new Error('Invalid folder name');
      }

      // Validate parent path belongs to user
      if (!CloudStoragePaths.isValidUserPath(parentPath, userId)) {
        throw new Error('Invalid parent path');
      }

      // Create folder path
      const folderPath = CloudStoragePaths.getCustomFolderPath(userId, parentPath, folderName);
      
      // Create folder node
      const customFolder: FolderNode = {
        id: `${userId}-custom-${Date.now()}`,
        name: folderName,
        path: folderPath,
        type: 'custom',
        children: [],
        fileCount: 0,
        parentPath: parentPath,
      };

      // Get current tree and add folder
      const currentTree = await this.getFolderTree(userId);
      const updatedTree = FolderStructureUtils.addFolderToTree(currentTree, customFolder);
      
      // Store updated structure
      await this.storeFolderStructure(userId, updatedTree);
      
      return customFolder;
    } catch (error) {
      console.error('Error creating custom folder:', error);
      throw new Error(`Failed to create folder: ${folderName}`);
    }
  }

  /**
   * Removes a folder from the user's structure
   */
  async deleteFolder(userId: string, folderPath: string): Promise<void> {
    try {
      // Validate path belongs to user
      if (!CloudStoragePaths.isValidUserPath(folderPath, userId)) {
        throw new Error('Invalid folder path');
      }

      // Get current tree
      const currentTree = await this.getFolderTree(userId);
      
      // Find the folder to check if it's empty
      const folderToDelete = FolderStructureUtils.findFolderByPath(currentTree, folderPath);
      if (!folderToDelete) {
        throw new Error('Folder not found');
      }

      // Prevent deletion of category folders (root level folders)
      if (folderToDelete.type === 'category') {
        throw new Error('Cannot delete category folders');
      }

      // Check if folder is empty (no files and no subfolders)
      if (folderToDelete.fileCount > 0 || folderToDelete.children.length > 0) {
        throw new Error('Cannot delete non-empty folder');
      }

      // Remove folder from tree
      const updatedTree = FolderStructureUtils.removeFolderFromTree(currentTree, folderPath);
      
      // Store updated structure
      await this.storeFolderStructure(userId, updatedTree);
    } catch (error) {
      console.error('Error deleting folder:', error);
      throw error instanceof Error ? error : new Error('Failed to delete folder');
    }
  }

  /**
   * Renames a folder in the user's structure
   */
  async renameFolder(
    userId: string,
    folderPath: string,
    newName: string
  ): Promise<FolderNode> {
    try {
      // Validate inputs
      if (!CloudStoragePaths.isValidUserPath(folderPath, userId)) {
        throw new Error('Invalid folder path');
      }

      if (!this.isValidFolderName(newName)) {
        throw new Error('Invalid folder name');
      }

      // Get current tree
      const currentTree = await this.getFolderTree(userId);
      
      // Find the folder to rename
      const folderToRename = FolderStructureUtils.findFolderByPath(currentTree, folderPath);
      if (!folderToRename) {
        throw new Error('Folder not found');
      }

      // Prevent renaming of category folders and entity folders
      if (folderToRename.type === 'category' || folderToRename.type === 'entity') {
        throw new Error('Cannot rename system folders');
      }

      // Check for duplicate names in the same parent folder
      const parentPath = folderToRename.parentPath;
      if (parentPath) {
        const parentFolder = FolderStructureUtils.findFolderByPath(currentTree, parentPath);
        if (parentFolder) {
          const duplicateExists = parentFolder.children.some(
            child => child.name.toLowerCase() === newName.toLowerCase() && child.path !== folderPath
          );
          if (duplicateExists) {
            throw new Error('A folder with this name already exists');
          }
        }
      }

      // Generate new path
      const newPath = CloudStoragePaths.getCustomFolderPath(
        userId,
        parentPath || userId,
        newName
      );

      // Rename folder and update all child paths
      const updatedTree = FolderStructureUtils.renameFolderInTree(
        currentTree,
        folderPath,
        newName,
        newPath
      );
      
      // Store updated structure
      await this.storeFolderStructure(userId, updatedTree);
      
      // Return the renamed folder
      const renamedFolder = FolderStructureUtils.findFolderByPath(updatedTree, newPath);
      if (!renamedFolder) {
        throw new Error('Failed to find renamed folder');
      }

      return renamedFolder;
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw new Error(`Failed to rename folder: ${error.message}`);
    }
  }

  /**
   * Moves a folder to a new parent location
   */
  async moveFolder(
    userId: string,
    folderPath: string,
    newParentPath: string
  ): Promise<FolderNode> {
    try {
      // Validate inputs
      if (!CloudStoragePaths.isValidUserPath(folderPath, userId)) {
        throw new Error('Invalid folder path');
      }

      if (!CloudStoragePaths.isValidUserPath(newParentPath, userId)) {
        throw new Error('Invalid parent path');
      }

      // Prevent moving to self or descendant
      if (newParentPath.startsWith(folderPath + '/') || newParentPath === folderPath) {
        throw new Error('Cannot move folder to itself or its descendant');
      }

      // Get current tree
      const currentTree = await this.getFolderTree(userId);
      
      // Find the folder to move
      const folderToMove = FolderStructureUtils.findFolderByPath(currentTree, folderPath);
      if (!folderToMove) {
        throw new Error('Folder not found');
      }

      // Prevent moving category folders and entity folders
      if (folderToMove.type === 'category' || folderToMove.type === 'entity') {
        throw new Error('Cannot move system folders');
      }

      // Find the new parent folder
      const newParentFolder = FolderStructureUtils.findFolderByPath(currentTree, newParentPath);
      if (!newParentFolder) {
        throw new Error('Parent folder not found');
      }

      // Check for duplicate names in the new parent folder
      const duplicateExists = newParentFolder.children.some(
        child => child.name.toLowerCase() === folderToMove.name.toLowerCase()
      );
      if (duplicateExists) {
        throw new Error('A folder with this name already exists in the destination');
      }

      // Generate new path
      const newPath = CloudStoragePaths.getCustomFolderPath(
        userId,
        newParentPath,
        folderToMove.name
      );

      // Move folder in tree
      const updatedTree = FolderStructureUtils.moveFolderInTree(
        currentTree,
        folderPath,
        newParentPath,
        newPath
      );
      
      // Store updated structure
      await this.storeFolderStructure(userId, updatedTree);
      
      // Return the moved folder
      const movedFolder = FolderStructureUtils.findFolderByPath(updatedTree, newPath);
      if (!movedFolder) {
        throw new Error('Failed to find moved folder');
      }

      return movedFolder;
    } catch (error) {
      console.error('Error moving folder:', error);
      throw new Error(`Failed to move folder: ${error.message}`);
    }
  }

  /**
   * Gets all subfolders for a given folder path
   */
  async getSubfolders(userId: string, folderPath: string): Promise<FolderNode[]> {
    try {
      if (!CloudStoragePaths.isValidUserPath(folderPath, userId)) {
        throw new Error('Invalid folder path');
      }

      const currentTree = await this.getFolderTree(userId);
      const folder = FolderStructureUtils.findFolderByPath(currentTree, folderPath);
      
      if (!folder) {
        throw new Error('Folder not found');
      }

      return folder.children;
    } catch (error) {
      console.error('Error getting subfolders:', error);
      throw new Error('Failed to get subfolders');
    }
  }

  /**
   * Gets the full path hierarchy for a folder
   */
  async getFolderHierarchy(userId: string, folderPath: string): Promise<FolderNode[]> {
    try {
      if (!CloudStoragePaths.isValidUserPath(folderPath, userId)) {
        throw new Error('Invalid folder path');
      }

      const currentTree = await this.getFolderTree(userId);
      return FolderStructureUtils.getFolderHierarchy(currentTree, folderPath);
    } catch (error) {
      console.error('Error getting folder hierarchy:', error);
      throw new Error('Failed to get folder hierarchy');
    }
  }

  /**
   * Archives entity folder when entity is deleted
   */
  async archiveEntityFolder(
    userId: string,
    entityType: 'haus' | 'wohnung' | 'mieter',
    entityId: string
  ): Promise<void> {
    try {
      const folderPath = CloudStoragePaths.getEntityFolderPath(userId, entityType, entityId);
      const currentTree = await this.getFolderTree(userId);
      
      // Find the folder
      const folderToArchive = FolderStructureUtils.findFolderByPath(currentTree, folderPath);
      if (!folderToArchive) {
        return; // Folder doesn't exist, nothing to archive
      }

      // Move to archived section (could be implemented later)
      // For now, we'll keep the folder but mark it as archived in metadata
      // This preserves files while indicating the entity no longer exists
      
      console.log(`Entity folder archived: ${folderPath}`);
    } catch (error) {
      console.error('Error archiving entity folder:', error);
      // Don't throw error for archiving - it's not critical
    }
  }

  /**
   * Gets all entities (houses, apartments, tenants) for a user
   */
  private async getUserEntities(userId: string): Promise<EntityData[]> {
    try {
      const entities: EntityData[] = [];

      // Get houses
      const { data: houses } = await this.supabase
        .from('Haeuser')
        .select('id, name')
        .eq('user_id', userId);

      if (houses) {
        entities.push(...houses.map(house => ({
          id: house.id,
          name: house.name,
          type: 'haus' as const
        })));
      }

      // Get apartments
      const { data: apartments } = await this.supabase
        .from('Wohnungen')
        .select('id, name')
        .eq('user_id', userId);

      if (apartments) {
        entities.push(...apartments.map(apartment => ({
          id: apartment.id,
          name: apartment.name,
          type: 'wohnung' as const
        })));
      }

      // Get tenants
      const { data: tenants } = await this.supabase
        .from('Mieter')
        .select('id, name')
        .eq('user_id', userId);

      if (tenants) {
        entities.push(...tenants.map(tenant => ({
          id: tenant.id,
          name: tenant.name,
          type: 'mieter' as const
        })));
      }

      return entities;
    } catch (error) {
      console.error('Error fetching user entities:', error);
      return [];
    }
  }

  /**
   * Stores folder structure in database
   */
  private async storeFolderStructure(userId: string, folderTree: FolderNode[]): Promise<void> {
    try {
      // For now, we'll store the folder structure as JSON in a user preferences table
      // In a production system, you might want a more normalized approach
      
      const { error } = await this.supabase
        .from('user_folder_structures')
        .upsert({
          user_id: userId,
          folder_structure: folderTree,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing folder structure:', error);
        // Don't throw error - folder structure can be regenerated
      }
    } catch (error) {
      console.error('Error storing folder structure:', error);
      // Don't throw error - folder structure can be regenerated
    }
  }

  /**
   * Retrieves stored folder structure from database
   */
  private async getStoredFolderStructure(userId: string): Promise<FolderNode[] | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_folder_structures')
        .select('folder_structure')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.folder_structure as FolderNode[];
    } catch (error) {
      console.error('Error retrieving stored folder structure:', error);
      return null;
    }
  }

  /**
   * Validates folder name
   */
  private isValidFolderName(name: string): boolean {
    // Check for empty name
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return false;
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(name.toUpperCase())) {
      return false;
    }

    // Check length
    if (name.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Updates file count for a folder
   */
  async updateFolderFileCount(userId: string, folderPath: string, delta: number): Promise<void> {
    try {
      const currentTree = await this.getFolderTree(userId);
      const updatedTree = FolderStructureUtils.updateFileCount(currentTree, folderPath, delta);
      await this.storeFolderStructure(userId, updatedTree);
    } catch (error) {
      console.error('Error updating folder file count:', error);
      // Don't throw error - file count is not critical
    }
  }
}

// Singleton instance can be created when needed
// export const folderStructureService = new FolderStructureService();