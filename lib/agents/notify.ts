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

export async function sendNotifications(
  channels: NotifyChannel[] | null | undefined,
  context: NotifyContext
): Promise<void> {
  if (!channels || !Array.isArray(channels)) return;

  for (const channel of channels) {
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
          if (channel.config?.url) {
            await fetch(channel.config.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(context),
            });
          }
          break;
      }
    } catch (err) {
      console.error(`[Notify] Error delivering notification for channel ${channel.type}:`, err);
    }
  }
}
