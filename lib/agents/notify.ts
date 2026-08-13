export interface NotifyChannel {
  type: 'email' | 'in_app' | 'webhook';
  config: Record<string, any>;
}

export interface NotifyContext {
  agentName: string;
  result?: any;
  error?: string;
  runId: string;
}

export function isSafeWebhookUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local')
    ) {
      return false;
    }
    // Block private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x)
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/.test(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function sendNotifications(
  channels: NotifyChannel[] | null | undefined,
  context: NotifyContext
): Promise<void> {
  if (!channels || !Array.isArray(channels)) return;

  const tasks = channels.map(async (channel) => {
    try {
      switch (channel.type) {
        case 'email':
          if (channel.config?.recipients) {
            console.log(`[Notify] Sending email to ${channel.config.recipients} for agent run ${context.runId}`);
          }
          break;
        case 'in_app':
          console.log(`[Notify] In-app notification for agent ${context.agentName} (run ${context.runId})`);
          break;
        case 'webhook':
          if (channel.config?.url && isSafeWebhookUrl(channel.config.url)) {
            await fetch(channel.config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(context),
            });
          } else if (channel.config?.url) {
            console.warn(`[Notify] Webhook URL rejected by SSRF protection: ${channel.config.url}`);
          }
          break;
      }
    } catch (err) {
      console.error(`[Notify] Error delivering notification for channel ${channel.type}:`, err);
    }
  });

  await Promise.allSettled(tasks);
}
