export interface TriggerConfig {
  type: 'manual' | 'cron' | 'webhook' | 'db_event';
  config?: Record<string, any>;
}

export function validateTrigger(triggerConfig: TriggerConfig, request: Request): boolean {
  if (!triggerConfig || !triggerConfig.type) {
    return false;
  }

  switch (triggerConfig.type) {
    case 'manual':
      return true;
    case 'cron':
      return request.headers.get('X-Cron-Secret') === process.env.CRON_SECRET;
    case 'webhook':
      const secret = triggerConfig.config?.secret;
      if (!secret) return false;
      return request.headers.get('X-Webhook-Secret') === secret;
    case 'db_event':
      const dbSecret = process.env.SUPABASE_WEBHOOK_SECRET || triggerConfig.config?.secret;
      if (!dbSecret) return true;
      return request.headers.get('X-Webhook-Secret') === dbSecret;
    default:
      return false;
  }
}
