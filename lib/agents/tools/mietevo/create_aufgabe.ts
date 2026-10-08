import { z } from 'zod';
import { sandboxRpc } from '@/lib/sandbox/runner';
import { agentRuntimeLocalStorage } from '../../mietevo-agent';

export const createAufgabe = {
  description: 'Erstellt eine neue Aufgabe (Todo) in einem Haus oder global. Erfordert Berechtigung: aufgaben.erstellen.',
  parameters: z.object({
    titel: z.string().describe('Titel der Aufgabe'),
    beschreibung: z.string().optional().describe('Optionale Beschreibung/Details der Aufgabe'),
    hausId: z.string().uuid().optional().describe('Optionale Haus-ID, der die Aufgabe zugeordnet wird'),
  }),
  execute: async (args: any) => {
    const { titel, beschreibung, hausId } = args;
    const context: any = agentRuntimeLocalStorage.getStore() || {};
    return sandboxRpc('create_aufgabe', {
      p_titel: titel,
      p_beschreibung: beschreibung,
      p_haus_id: hausId,
      p_org_id: context.orgId,
      p_mitglied_id: context.agentMitgliedId,
    }, context.userJwt);
  },
} as any;
