import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface SyncMetrics {
  syncId: string;
  syncType: 'manual' | 'scheduled';
  startedAt: Date;
  completedAt?: Date;
  success?: boolean;
  pagesProcessed: number;
  errors: string[];
  message?: string;
  duration?: number;
}

export interface AlertConfig {
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
  enableAlerts: boolean;
}

export class SyncMonitor {
  private supabase: any;
  private alertConfig: AlertConfig;

  constructor(supabaseUrl: string, supabaseKey: string, alertConfig: AlertConfig = { enableAlerts: false }) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.alertConfig = alertConfig;
  }

  async startSync(syncType: 'manual' | 'scheduled'): Promise<string> {
    try {
      const syncId = crypto.randomUUID();
      
      const { error } = await this.supabase
        .from('NotionSyncLog')
        .insert({
          id: syncId,
          sync_type: syncType,
          started_at: new Date().toISOString(),
          success: null,
          pages_processed: 0,
          errors: [],
          message: 'Sync started'
        });

      if (error) {
        console.error('Failed to log sync start:', error);
        throw error;
      }

      console.log(`Sync ${syncId} started (${syncType})`);
      return syncId;
    } catch (error) {
      console.error('Error starting sync monitoring:', error);
      throw error;
    }
  }

  async updateSync(syncId: string, metrics: Partial<SyncMetrics>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (metrics.completedAt) {
        updateData.completed_at = metrics.completedAt.toISOString();
      }
      
      if (metrics.success !== undefined) {
        updateData.success = metrics.success;
      }
      
      if (metrics.pagesProcessed !== undefined) {
        updateData.pages_processed = metrics.pagesProcessed;
      }
      
      if (metrics.errors) {
        updateData.errors = metrics.errors;
      }
      
      if (metrics.message) {
        updateData.message = metrics.message;
      }

      const { error } = await this.supabase
        .from('NotionSyncLog')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        console.error('Failed to update sync log:', error);
        throw error;
      }

      console.log(`Sync ${syncId} updated:`, updateData);
    } catch (error) {
      console.error('Error updating sync monitoring:', error);
      throw error;
    }
  }

  async completeSync(syncId: string, success: boolean, pagesProcessed: number, errors: string[], message?: string): Promise<void> {
    try {
      const completedAt = new Date();
      
      // Get start time to calculate duration
      const { data: syncLog } = await this.supabase
        .from('NotionSyncLog')
        .select('started_at')
        .eq('id', syncId)
        .single();

      let duration: number | undefined;
      if (syncLog?.started_at) {
        const startTime = new Date(syncLog.started_at);
        duration = completedAt.getTime() - startTime.getTime();
      }

      await this.updateSync(syncId, {
        syncId,
        syncType: 'manual', // This will be ignored in update
        startedAt: new Date(), // This will be ignored in update
        completedAt,
        success,
        pagesProcessed,
        errors,
        message: message || (success ? 'Sync completed successfully' : 'Sync completed with errors'),
        duration
      });

      // Send alerts if enabled and there are issues
      if (this.alertConfig.enableAlerts) {
        await this.checkAndSendAlerts(syncId, success, errors, pagesProcessed, duration);
      }

      console.log(`Sync ${syncId} completed: success=${success}, processed=${pagesProcessed}, errors=${errors.length}`);
    } catch (error) {
      console.error('Error completing sync monitoring:', error);
      throw error;
    }
  }

  private async checkAndSendAlerts(syncId: string, success: boolean, errors: string[], pagesProcessed: number, duration?: number): Promise<void> {
    try {
      const shouldAlert = !success || errors.length > 0 || (duration && duration > 300000); // Alert if sync takes > 5 minutes
      
      if (!shouldAlert) {
        return;
      }

      const alertMessage = this.buildAlertMessage(syncId, success, errors, pagesProcessed, duration);
      
      // Send webhook alert
      if (this.alertConfig.webhookUrl) {
        await this.sendWebhookAlert(alertMessage);
      }

      // Send Slack alert
      if (this.alertConfig.slackChannel) {
        await this.sendSlackAlert(alertMessage);
      }

      // Log alert
      console.log('Alert sent for sync:', syncId);
    } catch (error) {
      console.error('Error sending alerts:', error);
    }
  }

  private buildAlertMessage(syncId: string, success: boolean, errors: string[], pagesProcessed: number, duration?: number): string {
    const status = success ? '✅ SUCCESS' : '❌ FAILED';
    const durationText = duration ? ` (${Math.round(duration / 1000)}s)` : '';
    
    let message = `🔄 Notion Documentation Sync ${status}\n`;
    message += `📋 Sync ID: ${syncId}\n`;
    message += `📊 Pages Processed: ${pagesProcessed}\n`;
    message += `⏱️ Duration: ${durationText}\n`;
    
    if (errors.length > 0) {
      message += `\n❌ Errors (${errors.length}):\n`;
      errors.slice(0, 5).forEach((error, index) => {
        message += `${index + 1}. ${error}\n`;
      });
      
      if (errors.length > 5) {
        message += `... and ${errors.length - 5} more errors\n`;
      }
    }
    
    message += `\n🕐 Timestamp: ${new Date().toISOString()}`;
    
    return message;
  }

  private async sendWebhookAlert(message: string): Promise<void> {
    try {
      if (!this.alertConfig.webhookUrl) return;

      const response = await fetch(this.alertConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          timestamp: new Date().toISOString(),
          service: 'notion-documentation-sync'
        }),
      });

      if (!response.ok) {
        console.error('Failed to send webhook alert:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error sending webhook alert:', error);
    }
  }

  private async sendSlackAlert(message: string): Promise<void> {
    try {
      if (!this.alertConfig.slackChannel) return;

      // This would require a Slack webhook URL or bot token
      // For now, we'll just log that a Slack alert would be sent
      console.log('Slack alert would be sent to channel:', this.alertConfig.slackChannel);
      console.log('Message:', message);
    } catch (error) {
      console.error('Error sending Slack alert:', error);
    }
  }

  async getSyncHistory(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('NotionSyncLog')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch sync history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching sync history:', error);
      throw error;
    }
  }

  async getSyncStats(days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('NotionSyncLog')
        .select('*')
        .gte('started_at', startDate.toISOString());

      if (error) {
        console.error('Failed to fetch sync stats:', error);
        throw error;
      }

      const logs = data || [];
      
      const stats = {
        totalSyncs: logs.length,
        successfulSyncs: logs.filter(log => log.success === true).length,
        failedSyncs: logs.filter(log => log.success === false).length,
        totalPagesProcessed: logs.reduce((sum, log) => sum + (log.pages_processed || 0), 0),
        averageDuration: 0,
        lastSync: logs.length > 0 ? logs[0] : null,
        errorRate: 0
      };

      // Calculate average duration for completed syncs
      const completedSyncs = logs.filter(log => log.completed_at && log.started_at);
      if (completedSyncs.length > 0) {
        const totalDuration = completedSyncs.reduce((sum, log) => {
          const duration = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime();
          return sum + duration;
        }, 0);
        stats.averageDuration = Math.round(totalDuration / completedSyncs.length / 1000); // in seconds
      }

      // Calculate error rate
      if (stats.totalSyncs > 0) {
        stats.errorRate = Math.round((stats.failedSyncs / stats.totalSyncs) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error calculating sync stats:', error);
      throw error;
    }
  }

  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await this.supabase
        .from('NotionSyncLog')
        .delete()
        .lt('started_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Failed to cleanup old sync logs:', error);
        throw error;
      }

      const deletedCount = data?.length || 0;
      console.log(`Cleaned up ${deletedCount} old sync logs`);
      
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old sync logs:', error);
      throw error;
    }
  }
}

// Health check function
export async function performHealthCheck(supabaseUrl: string, supabaseKey: string): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
  message: string;
}> {
  const checks: Record<string, boolean> = {};
  let healthy = true;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database connection
    try {
      const { error } = await supabase
        .from('Dokumentation')
        .select('count')
        .limit(1);
      checks.database = !error;
    } catch {
      checks.database = false;
    }

    // Check if sync log table exists
    try {
      const { error } = await supabase
        .from('NotionSyncLog')
        .select('count')
        .limit(1);
      checks.syncLog = !error;
    } catch {
      checks.syncLog = false;
    }

    // Check recent sync status
    try {
      const { data, error } = await supabase
        .from('NotionSyncLog')
        .select('success, started_at')
        .order('started_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const lastSync = data[0];
        const lastSyncTime = new Date(lastSync.started_at);
        const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);
        
        // Consider healthy if last sync was within 24 hours and successful
        checks.recentSync = hoursSinceLastSync < 24 && lastSync.success;
      } else {
        checks.recentSync = false;
      }
    } catch {
      checks.recentSync = false;
    }

    // Overall health
    healthy = Object.values(checks).every(check => check);

    return {
      healthy,
      checks,
      message: healthy ? 'All systems operational' : 'Some systems need attention'
    };

  } catch (error) {
    return {
      healthy: false,
      checks: { error: false },
      message: `Health check failed: ${error.message}`
    };
  }
}