import { posthog } from '@/lib/posthog';

export async function isAgentBuilderEnabled(distinctId: string): Promise<boolean> {
  return await posthog.isFeatureEnabled('mietevo-agent-builder', { distinctId });
}
