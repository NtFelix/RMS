import { z } from 'zod';
import { sandboxRpc } from '@/lib/sandbox/runner';
import { agentRuntimeLocalStorage } from '../../mietevo-agent';

export const fetchFinanzen = {
  description: 'Ruft eine Finanzübersicht ab. Erfordert Berechtigung: finanzen.ansehen.',
  parameters: z.object({
    hausId: z.string().uuid().optional().describe('Optionale Haus-ID zum Filtern der Finanzen'),
    limit: z.number().optional().default(50).describe('Maximale Anzahl der Transaktionen'),
  }),
  execute: async (args: any) => {
    const { hausId, limit } = args;
    const context: any = agentRuntimeLocalStorage.getStore() || {};
    return sandboxRpc('fetch_finanzen_summary', {
      p_haus_id: hausId,
      p_limit: limit,
      p_org_id: context.orgId,
      p_mitglied_id: context.agentMitgliedId,
    }, context.userJwt);
  },
} as any;
