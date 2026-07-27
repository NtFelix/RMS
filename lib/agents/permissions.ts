import { type SupabaseClient } from '@supabase/supabase-js';

const ADMIN_ROLES = ['owner', 'admin'] as const;

export async function resolveMitgliedId(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<string | null> {
  const { data: member } = await supabase
    .from('Organisation_Mitglieder')
    .select('id, rolle')
    .eq('organisation_id', orgId)
    .eq('user_id', userId)
    .is('geloescht_am', null)
    .single();

  if (!member) return null;
  return member.id;
}

export async function isOrgAdminOrOwner(
  supabase: SupabaseClient,
  mitgliedId: string
): Promise<boolean> {
  const { data: member } = await supabase
    .from('Organisation_Mitglieder')
    .select('rolle')
    .eq('id', mitgliedId)
    .is('geloescht_am', null)
    .single();

  if (!member) return false;
  return ADMIN_ROLES.includes(member.rolle as typeof ADMIN_ROLES[number]);
}

export async function checkAgentAccess(
  supabase: SupabaseClient,
  agentId: string,
  callerMitgliedId: string,
  requiredLevels: Array<'view' | 'manage' | 'results_only'>
): Promise<boolean> {
  const isAdmin = await isOrgAdminOrOwner(supabase, callerMitgliedId);
  if (isAdmin) return true;

  const { data: access } = await supabase
    .from('KI_Agenten_Zugriffsrechte')
    .select('zugriffs_level')
    .eq('agent_id', agentId)
    .eq('mitglied_id', callerMitgliedId)
    .is('geloescht_am', null)
    .maybeSingle();

  if (!access) return false;
  return requiredLevels.includes(access.zugriffs_level as typeof requiredLevels[number]);
}
