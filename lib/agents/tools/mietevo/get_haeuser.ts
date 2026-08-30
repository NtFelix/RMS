import { z } from 'zod';
import { sandboxRpc } from '@/lib/sandbox/runner';
import { agentRuntimeLocalStorage } from '../../mietevo-agent';

export const getHaeuser = {
  description: 'Ruft eine Liste aller Häuser der Organisation ab. Erfordert Berechtigung: haeuser.ansehen.',
  parameters: z.object({
    limit: z.number().optional().default(50).describe('Maximale Anzahl der Häuser'),
  }),
  execute: async (args: any) => {
    const { limit } = args;
    const context: any = agentRuntimeLocalStorage.getStore() || {};
    return sandboxRpc('get_haeuser_list', {
      p_limit: limit,
      p_org_id: context.orgId,
      p_mitglied_id: context.agentMitgliedId,
    }, context.userJwt);
  },
} as any;
