import { getPostHogServer } from '@/app/posthog-server.mjs';

export const posthog = {
  isFeatureEnabled: async (key: string, options: { distinctId: string }): Promise<boolean> => {
    try {
      const server = getPostHogServer();
      if (!server || typeof server.isFeatureEnabled !== 'function') {
        return false;
      }
      const enabled = await server.isFeatureEnabled(key, options.distinctId);
      return Boolean(enabled);
    } catch {
      return false;
    }
  },
};
