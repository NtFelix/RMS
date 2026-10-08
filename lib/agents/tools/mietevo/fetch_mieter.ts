import { z } from 'zod';
import { sandboxRpc } from '@/lib/sandbox/runner';
import { agentRuntimeLocalStorage } from '../../mietevo-agent';

export const fetchMieter = {
  description: 'Ruft eine Liste von Mietern ab. Erfordert Berechtigung: mieter.ansehen.',
  parameters: z.object({
    hausId: z.string().uuid().optional().describe('Optionale Haus-ID zum Filtern'),
    search: z.string().optional().describe('Optionaler Suchbegriff für Name/Email'),
    limit: z.number().optional().default(50).describe('Maximale Anzahl der zurückzugebenden Mieter'),
  }),
  execute: async (args: any) => {
    const { hausId, search, limit } = args;
    const context: any = agentRuntimeLocalStorage.getStore() || {};
    return sandboxRpc('fetch_mieter_list', {
      p_haus_id: hausId,
      p_search: search,
      p_limit: limit,
      p_org_id: context.orgId,
      p_mitglied_id: context.agentMitgliedId,
    }, context.userJwt);
  },
} as any;
