import crypto from 'crypto';

export interface TriggerConfig {
  type: 'manual' | 'cron' | 'webhook' | 'db_event';
  config?: Record<string, any>;
}

function safeCompare(a: string | null, b: string): boolean {
  if (!a || typeof a !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateTrigger(triggerConfig: TriggerConfig, request: Request): boolean {
  if (!triggerConfig || !triggerConfig.type) {
    return false;
  }

  switch (triggerConfig.type) {
    case 'manual':
      return true;
    case 'cron':
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) return false;
      return safeCompare(request.headers.get('X-Cron-Secret'), cronSecret);
    case 'webhook':
      const secret = triggerConfig.config?.secret;
      if (!secret) return false;
      return safeCompare(request.headers.get('X-Webhook-Secret'), secret);
    case 'db_event':
      const dbSecret = process.env.SUPABASE_WEBHOOK_SECRET || triggerConfig.config?.secret;
      if (!dbSecret) return false;
      return safeCompare(request.headers.get('X-Webhook-Secret'), dbSecret);
    default:
      return false;
  }
}
