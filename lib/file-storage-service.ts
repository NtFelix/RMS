/**
 * File Storage Service
 * Handles Supabase Storage integration for file uploads, downloads, and metadata operations
 */

import { createClient } from '@/utils/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { 
  FileItem, 
  FileUploadResult, 
  StorageQuota, 
  FileOperationError,
  SubscriptionLimits 
} from '@/types/cloud-storage';
import { 
  validateFile, 
  validateFiles, 
  getStorageQuotaStatus,
  getSubscriptionLimits,
  sanitizeFileName,
  generateUniqueFileName 
} from '@/lib/cloud-storage-validation';
import { CloudStoragePaths } from '@/lib/cloud-storage-utils';
import { STORAGE_CONFIG, ERROR_MESSAGES } from '@/lib/cloud-storage-constants';
import { fetchUserProfile } from '@/lib/data-fetching';

export class FileStorageService {
  private supabase;
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
    this.supabase = isServer ? createSupabaseServerClient() : createClient();
  }

  /**
   * Uploads a single file to storage
   */
  async uploadFile(
    file: File, 
    folderPath: string, 
    userId: string,
    entityType?: 'haus' | 'wohnung' | 'mieter' | 'sonstiges',
    entityId?: string
  ): Promise<FileUploadResult> {
    try {
      // Get user subscription limits
      const subscriptionLimits = await this.getUserSubscriptionLimits(userId);
      
      // Validate file
      const validation = validateFile(file, subscriptionLimits);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Check storage quota
      const currentUsage = await this.getUserStorageUsage(userId);
      if (currentUsage + file.size > subscriptionLimits.maxStorageBytes) {
        return {
          success: false,
          error: ERROR_MESSAGES.STORAGE_QUOTA_EXCEEDED
        };
      }

      // Sanitize filename and ensure uniqueness
      const sanitizedName = sanitizeFileName(file.name);
      const existingFiles = await this.getFilesInFolder(folderPath, userId);
      const existingNames = existingFiles.map(f => f.name);
      const uniqueName = generateUniqueFileName(sanitizedName, existingNames);

      // Generate storage path
      const storagePath = `${folderPath}/${uniqueName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return {
          success: false,
          error: ERROR_MESSAGES.UPLOAD_FAILED
        };
      }

      // Save file metadata to database
      const fileMetadata = {
        user_id: userId,
        file_name: uniqueName,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        folder_path: folderPath,
        entity_type: entityType || null,
        entity_id: entityId || null,
        storage_path: uploadData.path
      };

      const { data: metadataData, error: metadataError } = await this.supabase
        .from('file_metadata')
        .insert(fileMetadata)
        .select()
        .single();

      if (metadataError) {
        // Cleanup uploaded file if metadata save fails
        await this.supabase.storage
          .from(STORAGE_CONFIG.BUCKET_NAME)
          .remove([storagePath]);
        
        console.error('Metadata save error:', metadataError);
        return {
          success: false,
          error: ERROR_MESSAGES.UPLOAD_FAILED
        };
      }

      // Get signed URL for the uploaded file
      const { data: urlData } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      const fileItem: FileItem = {
        id: metadataData.id,
        name: metadataData.file_name,
        size: metadataData.file_size,
        mimeType: metadataData.mime_type,
        uploadedAt: metadataData.created_at,
        path: metadataData.file_path,
        url: urlData?.signedUrl,
        entityType: metadataData.entity_type,
        entityId: metadataData.entity_id,
        storagePath: metadataData.storage_path
      };

      return {
        success: true,
        file: fileItem
      };

    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: ERROR_MESSAGES.UNKNOWN_ERROR
      };
    }
  }

  /**
   * Uploads multiple files in batch
   */
  async uploadFiles(
    files: File[],
    folderPath: string,
    userId: string,
    entityType?: 'haus' | 'wohnung' | 'mieter' | 'sonstiges',
    entityId?: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    successful: FileItem[];
    failed: { file: File; error: string }[];
  }> {
    const subscriptionLimits = await this.getUserSubscriptionLimits(userId);
    const currentUsage = await this.getUserStorageUsage(userId);
    
    const { validFiles, invalidFiles } = validateFiles(files, subscriptionLimits, currentUsage);
    
    const successful: FileItem[] = [];
    const failed: { file: File; error: string }[] = [];
    
    // Add invalid files to failed list
    invalidFiles.forEach(({ file, errors }) => {
      failed.push({ file, error: errors.join(', ') });
    });

    // Upload valid files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const result = await this.uploadFile(file, folderPath, userId, entityType, entityId);
      
      if (result.success && result.file) {
        successful.push(result.file);
      } else {
        failed.push({ file, error: result.error || ERROR_MESSAGES.UPLOAD_FAILED });
      }

      // Report progress
      if (onProgress) {
        const progress = ((i + 1) / validFiles.length) * 100;
        onProgress(progress);
      }
    }

    return { successful, failed };
  }

  /**
   * Downloads a file from storage
   */
  async downloadFile(fileId: string, userId: string): Promise<Blob | null> {
    try {
      // Get file metadata
      const { data: fileData, error: fileError } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
      }

      // Download from storage
      const { data: downloadData, error: downloadError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .download(fileData.storage_path);

      if (downloadError || !downloadData) {
        throw new Error(ERROR_MESSAGES.UPLOAD_FAILED);
      }

      return downloadData;

    } catch (error) {
      console.error('File download error:', error);
      return null;
    }
  }

  /**
   * Deletes a file from storage and database
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Get file metadata
      const { data: fileData, error: fileError } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
      }

      // Delete from storage
      const { error: storageError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .remove([fileData.storage_path]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue with metadata deletion even if storage delete fails
      }

      // Delete metadata
      const { error: metadataError } = await this.supabase
        .from('file_metadata')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (metadataError) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      return true;

    } catch (error) {
      console.error('File delete error:', error);
      return false;
    }
  }

  /**
   * Moves a file to a different folder
   */
  async moveFile(fileId: string, newFolderPath: string, userId: string): Promise<FileItem | null> {
    try {
      // Get file metadata
      const { data: fileData, error: fileError } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
      }

      const newStoragePath = `${newFolderPath}/${fileData.file_name}`;

      // Move file in storage
      const { data: moveData, error: moveError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .move(fileData.storage_path, newStoragePath);

      if (moveError) {
        throw new Error(ERROR_MESSAGES.UPLOAD_FAILED);
      }

      // Update metadata
      const { data: updatedData, error: updateError } = await this.supabase
        .from('file_metadata')
        .update({
          folder_path: newFolderPath,
          file_path: newStoragePath,
          storage_path: newStoragePath
        })
        .eq('id', fileId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      // Get signed URL
      const { data: urlData } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(newStoragePath, 3600);

      return {
        id: updatedData.id,
        name: updatedData.file_name,
        size: updatedData.file_size,
        mimeType: updatedData.mime_type,
        uploadedAt: updatedData.created_at,
        path: updatedData.file_path,
        url: urlData?.signedUrl,
        entityType: updatedData.entity_type,
        entityId: updatedData.entity_id,
        storagePath: updatedData.storage_path
      };

    } catch (error) {
      console.error('File move error:', error);
      return null;
    }
  }

  /**
   * Renames a file
   */
  async renameFile(fileId: string, newName: string, userId: string): Promise<FileItem | null> {
    try {
      // Get file metadata
      const { data: fileData, error: fileError } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        throw new Error(ERROR_MESSAGES.FILE_NOT_FOUND);
      }

      const sanitizedName = sanitizeFileName(newName);
      const folderPath = CloudStoragePaths.getParentPath(fileData.file_path);
      const newStoragePath = `${folderPath}/${sanitizedName}`;

      // Check for duplicate names
      const existingFiles = await this.getFilesInFolder(fileData.folder_path, userId);
      const existingNames = existingFiles.filter(f => f.id !== fileId).map(f => f.name);
      const uniqueName = generateUniqueFileName(sanitizedName, existingNames);
      const finalStoragePath = `${folderPath}/${uniqueName}`;

      // Move file in storage (rename)
      const { error: moveError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .move(fileData.storage_path, finalStoragePath);

      if (moveError) {
        throw new Error(ERROR_MESSAGES.UPLOAD_FAILED);
      }

      // Update metadata
      const { data: updatedData, error: updateError } = await this.supabase
        .from('file_metadata')
        .update({
          file_name: uniqueName,
          file_path: finalStoragePath,
          storage_path: finalStoragePath
        })
        .eq('id', fileId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
      }

      // Get signed URL
      const { data: urlData } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(finalStoragePath, 3600);

      return {
        id: updatedData.id,
        name: updatedData.file_name,
        size: updatedData.file_size,
        mimeType: updatedData.mime_type,
        uploadedAt: updatedData.created_at,
        path: updatedData.file_path,
        url: urlData?.signedUrl,
        entityType: updatedData.entity_type,
        entityId: updatedData.entity_id,
        storagePath: updatedData.storage_path
      };

    } catch (error) {
      console.error('File rename error:', error);
      return null;
    }
  }

  /**
   * Gets files in a specific folder
   */
  async getFilesInFolder(folderPath: string, userId: string): Promise<FileItem[]> {
    try {
      const { data: filesData, error: filesError } = await this.supabase
        .from('file_metadata')
        .select('*')
        .eq('user_id', userId)
        .eq('folder_path', folderPath)
        .order('created_at', { ascending: false });

      if (filesError) {
        console.error('Error fetching files:', filesError);
        return [];
      }

      // Get signed URLs for all files
      const filesWithUrls = await Promise.all(
        (filesData || []).map(async (file) => {
          const { data: urlData } = await this.supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .createSignedUrl(file.storage_path, 3600);

          return {
            id: file.id,
            name: file.file_name,
            size: file.file_size,
            mimeType: file.mime_type,
            uploadedAt: file.created_at,
            path: file.file_path,
            url: urlData?.signedUrl,
            entityType: file.entity_type,
            entityId: file.entity_id,
            storagePath: file.storage_path
          };
        })
      );

      return filesWithUrls;

    } catch (error) {
      console.error('Error getting files in folder:', error);
      return [];
    }
  }

  /**
   * Gets user's total storage usage
   */
  async getUserStorageUsage(userId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .select('file_size')
        .eq('user_id', userId);

      if (error) {
        console.error('Error calculating storage usage:', error);
        return 0;
      }

      return (data || []).reduce((total, file) => total + file.file_size, 0);

    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }

  /**
   * Gets user's storage quota information
   */
  async getUserStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      const subscriptionLimits = await this.getUserSubscriptionLimits(userId);
      const used = await this.getUserStorageUsage(userId);
      
      return {
        used,
        limit: subscriptionLimits.maxStorageBytes,
        percentage: used / subscriptionLimits.maxStorageBytes
      };

    } catch (error) {
      console.error('Error getting storage quota:', error);
      return {
        used: 0,
        limit: 100 * 1024 * 1024, // Default to basic plan
        percentage: 0
      };
    }
  }

  /**
   * Checks if user can upload more files based on quota
   */
  async canUploadFiles(userId: string, fileSizes: number[]): Promise<boolean> {
    try {
      const quota = await this.getUserStorageQuota(userId);
      const totalNewSize = fileSizes.reduce((sum, size) => sum + size, 0);
      
      return (quota.used + totalNewSize) <= quota.limit;

    } catch (error) {
      console.error('Error checking upload capacity:', error);
      return false;
    }
  }

  /**
   * Gets user's subscription limits
   */
  private async getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
    try {
      if (this.isServer) {
        // Server-side: fetch user profile
        const profile = await fetchUserProfile();
        const plan = profile?.stripe_subscription_status === 'active' ? 'premium' : 'basic';
        return getSubscriptionLimits(plan);
      } else {
        // Client-side: make API call to get subscription info
        const response = await fetch('/api/user/subscription-limits');
        if (response.ok) {
          return await response.json();
        }
        
        // Fallback to basic plan
        return getSubscriptionLimits('basic');
      }

    } catch (error) {
      console.error('Error getting subscription limits:', error);
      return getSubscriptionLimits('basic');
    }
  }

  /**
   * Creates a signed URL for file access
   */
  async createSignedUrl(fileId: string, userId: string, expiresIn = 3600): Promise<string | null> {
    try {
      const { data: fileData, error: fileError } = await this.supabase
        .from('file_metadata')
        .select('storage_path')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();

      if (fileError || !fileData) {
        return null;
      }

      const { data: urlData, error: urlError } = await this.supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .createSignedUrl(fileData.storage_path, expiresIn);

      if (urlError || !urlData) {
        return null;
      }

      return urlData.signedUrl;

    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }

  /**
   * Searches files across user's storage
   */
  async searchFiles(
    userId: string,
    query: string,
    options: {
      fileType?: string;
      entityType?: 'haus' | 'wohnung' | 'mieter' | 'sonstiges';
      entityId?: string;
      limit?: number;
    } = {}
  ): Promise<FileItem[]> {
    try {
      let queryBuilder = this.supabase
        .from('file_metadata')
        .select('*')
        .eq('user_id', userId)
        .ilike('file_name', `%${query}%`);

      if (options.fileType) {
        queryBuilder = queryBuilder.ilike('mime_type', `%${options.fileType}%`);
      }

      if (options.entityType) {
        queryBuilder = queryBuilder.eq('entity_type', options.entityType);
      }

      if (options.entityId) {
        queryBuilder = queryBuilder.eq('entity_id', options.entityId);
      }

      if (options.limit) {
        queryBuilder = queryBuilder.limit(options.limit);
      }

      const { data: filesData, error: filesError } = await queryBuilder
        .order('created_at', { ascending: false });

      if (filesError) {
        console.error('Error searching files:', filesError);
        return [];
      }

      // Get signed URLs for search results
      const filesWithUrls = await Promise.all(
        (filesData || []).map(async (file) => {
          const { data: urlData } = await this.supabase.storage
            .from(STORAGE_CONFIG.BUCKET_NAME)
            .createSignedUrl(file.storage_path, 3600);

          return {
            id: file.id,
            name: file.file_name,
            size: file.file_size,
            mimeType: file.mime_type,
            uploadedAt: file.created_at,
            path: file.file_path,
            url: urlData?.signedUrl,
            entityType: file.entity_type,
            entityId: file.entity_id,
            storagePath: file.storage_path
          };
        })
      );

      return filesWithUrls;

    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  }
}

// Export singleton instances
export const fileStorageService = new FileStorageService(false); // Client-side
export const serverFileStorageService = new FileStorageService(true); // Server-side