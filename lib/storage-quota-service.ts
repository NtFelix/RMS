/**
 * Storage Quota Service
 * Handles storage quota checking, enforcement, and notifications
 */

import { createClient } from '@/utils/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { StorageQuota, SubscriptionLimits } from '@/types/cloud-storage';
import { getStorageQuotaStatus, getSubscriptionLimits } from '@/lib/cloud-storage-validation';
import { fetchUserProfile } from '@/lib/data-fetching';
import { SUBSCRIPTION_LIMITS } from '@/lib/cloud-storage-constants';

export class StorageQuotaService {
  private supabase;
  private isServer: boolean;

  constructor(isServer = false) {
    this.isServer = isServer;
    this.supabase = isServer ? createSupabaseServerClient() : createClient();
  }

  /**
   * Gets current storage usage for a user
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
   * Gets storage quota information for a user
   */
  async getStorageQuota(userId: string): Promise<StorageQuota> {
    try {
      const [used, limits] = await Promise.all([
        this.getUserStorageUsage(userId),
        this.getSubscriptionLimits(userId)
      ]);

      return {
        used,
        limit: limits.maxStorageBytes,
        percentage: used / limits.maxStorageBytes
      };

    } catch (error) {
      console.error('Error getting storage quota:', error);
      return {
        used: 0,
        limit: SUBSCRIPTION_LIMITS.BASIC.maxStorageBytes,
        percentage: 0
      };
    }
  }

  /**
   * Checks if user can upload files of given sizes
   */
  async canUploadFiles(userId: string, fileSizes: number[]): Promise<{
    canUpload: boolean;
    reason?: string;
    quotaStatus: StorageQuota;
  }> {
    try {
      const quota = await this.getStorageQuota(userId);
      const totalNewSize = fileSizes.reduce((sum, size) => sum + size, 0);
      const newTotal = quota.used + totalNewSize;

      if (newTotal > quota.limit) {
        return {
          canUpload: false,
          reason: 'Storage quota would be exceeded',
          quotaStatus: quota
        };
      }

      return {
        canUpload: true,
        quotaStatus: quota
      };

    } catch (error) {
      console.error('Error checking upload capacity:', error);
      return {
        canUpload: false,
        reason: 'Error checking storage quota',
        quotaStatus: {
          used: 0,
          limit: SUBSCRIPTION_LIMITS.BASIC.maxStorageBytes,
          percentage: 0
        }
      };
    }
  }

  /**
   * Gets storage quota status with warnings
   */
  async getQuotaStatus(userId: string): Promise<{
    quota: StorageQuota;
    status: 'ok' | 'warning' | 'critical' | 'exceeded';
    message?: string;
    shouldShowWarning: boolean;
  }> {
    try {
      const quota = await this.getStorageQuota(userId);
      const quotaStatus = getStorageQuotaStatus(quota.used, quota.limit);

      return {
        quota,
        status: quotaStatus.status,
        message: quotaStatus.message,
        shouldShowWarning: quotaStatus.status !== 'ok'
      };

    } catch (error) {
      console.error('Error getting quota status:', error);
      return {
        quota: {
          used: 0,
          limit: SUBSCRIPTION_LIMITS.BASIC.maxStorageBytes,
          percentage: 0
        },
        status: 'ok',
        shouldShowWarning: false
      };
    }
  }

  /**
   * Enforces storage quota before upload
   */
  async enforceQuotaForUpload(
    userId: string, 
    fileSizes: number[]
  ): Promise<{
    allowed: boolean;
    rejectedSizes: number[];
    allowedSizes: number[];
    reason?: string;
  }> {
    try {
      const quota = await this.getStorageQuota(userId);
      const allowedSizes: number[] = [];
      const rejectedSizes: number[] = [];
      let currentUsed = quota.used;

      for (const size of fileSizes) {
        if (currentUsed + size <= quota.limit) {
          allowedSizes.push(size);
          currentUsed += size;
        } else {
          rejectedSizes.push(size);
        }
      }

      return {
        allowed: rejectedSizes.length === 0,
        rejectedSizes,
        allowedSizes,
        reason: rejectedSizes.length > 0 ? 'Some files exceed storage quota' : undefined
      };

    } catch (error) {
      console.error('Error enforcing quota:', error);
      return {
        allowed: false,
        rejectedSizes: fileSizes,
        allowedSizes: [],
        reason: 'Error checking storage quota'
      };
    }
  }

  /**
   * Gets subscription limits for a user
   */
  private async getSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
    try {
      if (this.isServer) {
        // Server-side: fetch user profile
        const profile = await fetchUserProfile();
        const plan = profile?.stripe_subscription_status === 'active' ? 'premium' : 'basic';
        return getSubscriptionLimits(plan);
      } else {
        // Client-side: make API call
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
   * Calculates storage usage by entity type
   */
  async getStorageUsageByEntity(userId: string): Promise<{
    haeuser: number;
    wohnungen: number;
    mieter: number;
    sonstiges: number;
    total: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .select('file_size, entity_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error calculating entity storage usage:', error);
        return { haeuser: 0, wohnungen: 0, mieter: 0, sonstiges: 0, total: 0 };
      }

      const usage = {
        haeuser: 0,
        wohnungen: 0,
        mieter: 0,
        sonstiges: 0,
        total: 0
      };

      (data || []).forEach(file => {
        const size = file.file_size;
        usage.total += size;

        switch (file.entity_type) {
          case 'haus':
            usage.haeuser += size;
            break;
          case 'wohnung':
            usage.wohnungen += size;
            break;
          case 'mieter':
            usage.mieter += size;
            break;
          case 'sonstiges':
          default:
            usage.sonstiges += size;
            break;
        }
      });

      return usage;

    } catch (error) {
      console.error('Error getting entity storage usage:', error);
      return { haeuser: 0, wohnungen: 0, mieter: 0, sonstiges: 0, total: 0 };
    }
  }

  /**
   * Gets storage usage statistics
   */
  async getStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    largestFile: number;
    filesByType: Record<string, { count: number; size: number }>;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('file_metadata')
        .select('file_size, mime_type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting storage stats:', error);
        return {
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0,
          largestFile: 0,
          filesByType: {}
        };
      }

      const files = data || [];
      const totalFiles = files.length;
      const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
      const averageFileSize = totalFiles > 0 ? totalSize / totalFiles : 0;
      const largestFile = files.reduce((max, file) => Math.max(max, file.file_size), 0);

      const filesByType: Record<string, { count: number; size: number }> = {};
      files.forEach(file => {
        const type = file.mime_type;
        if (!filesByType[type]) {
          filesByType[type] = { count: 0, size: 0 };
        }
        filesByType[type].count++;
        filesByType[type].size += file.file_size;
      });

      return {
        totalFiles,
        totalSize,
        averageFileSize,
        largestFile,
        filesByType
      };

    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        averageFileSize: 0,
        largestFile: 0,
        filesByType: {}
      };
    }
  }

  /**
   * Checks if user needs to upgrade subscription
   */
  async shouldSuggestUpgrade(userId: string): Promise<{
    shouldSuggest: boolean;
    reason?: string;
    currentPlan: 'basic' | 'premium';
    quotaPercentage: number;
  }> {
    try {
      const [quota, limits] = await Promise.all([
        this.getStorageQuota(userId),
        this.getSubscriptionLimits(userId)
      ]);

      const currentPlan = limits.maxStorageBytes === SUBSCRIPTION_LIMITS.BASIC.maxStorageBytes ? 'basic' : 'premium';
      
      // Suggest upgrade if user is on basic plan and using > 80% of quota
      const shouldSuggest = currentPlan === 'basic' && quota.percentage > 0.8;
      
      return {
        shouldSuggest,
        reason: shouldSuggest ? 'Storage quota is running low' : undefined,
        currentPlan,
        quotaPercentage: quota.percentage
      };

    } catch (error) {
      console.error('Error checking upgrade suggestion:', error);
      return {
        shouldSuggest: false,
        currentPlan: 'basic',
        quotaPercentage: 0
      };
    }
  }
}

// Export singleton instances
export const storageQuotaService = new StorageQuotaService(false); // Client-side
export const serverStorageQuotaService = new StorageQuotaService(true); // Server-side