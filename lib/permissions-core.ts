export type Modul =
  | 'haeuser'
  | 'wohnungen'
  | 'mieter'
  | 'zaehler'
  | 'finanzen'
  | 'betriebskosten'
  | 'dokumente'
  | 'aufgaben'
  | 'vorlagen'
  | 'organisation';

export type Aktion = 'ansehen' | 'erstellen' | 'bearbeiten' | 'loeschen' | 'verwalten';

/**
 * Direct evaluation of permission logic in TypeScript to handle both
 * canonical array format and legacy boolean key-value formats.
 * Designed to be dependency-free so it is safe to use in Edge runtime/middleware.
 */
export async function evaluatePermission(
  supabase: any,
  userId: string,
  orgId: string | null,
  modul: Modul,
  aktion: Aktion
): Promise<boolean> {
  if (!userId || !orgId) return false;

  try {
    // 1. Fetch membership details
    const { data: membership, error: memError } = await supabase
      .from('Organisation_Mitglieder')
      .select('id, rolle, status')
      .eq('organisation_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memError || !membership || membership.status !== 'aktiv') {
      return false;
    }

    // Owners and Admins have implicit full access to all modules and actions
    if (membership.rolle === 'owner' || membership.rolle === 'admin') {
      return true;
    }

    const mitgliedId = membership.id;

    // 2. Fetch overrides and policies in parallel to minimize round-trips
    const [overrideResult, memberPoliciesResult] = await Promise.all([
      supabase
        .from('Organisation_Mitglieder_Overrides')
        .select('berechtigungen')
        .eq('mitglied_id', mitgliedId)
        .maybeSingle(),
      supabase
        .from('Organisation_Mitglieder_Policies')
        .select('policy_id')
        .eq('mitglied_id', mitgliedId)
    ]);

    const { data: override, error: overrideError } = overrideResult;
    const { data: memberPolicies, error: policiesError } = memberPoliciesResult;

    if (!overrideError && override && override.berechtigungen) {
      const overrideB = override.berechtigungen as any;
      if (overrideB.module && overrideB.module[modul] !== undefined) {
        const moduleOver = overrideB.module[modul];
        if (Array.isArray(moduleOver)) {
          return moduleOver.includes(aktion);
        } else if (typeof moduleOver === 'object' && moduleOver !== null) {
          return !!moduleOver[aktion];
        }
      }
    }

    if (policiesError || !memberPolicies || memberPolicies.length === 0) {
      return false;
    }

    const policyIds = memberPolicies.map((mp: any) => mp.policy_id);

    const { data: policies, error: policiesQueryError } = await supabase
      .from('Organisation_Policies')
      .select('berechtigungen')
      .in('id', policyIds)
      .eq('organisation_id', orgId);

    if (policiesQueryError || !policies) {
      return false;
    }

    // OR logic across all assigned policies
    for (const policy of policies) {
      const policyB = policy.berechtigungen as any;
      if (policyB && policyB.module && policyB.module[modul]) {
        const modulePol = policyB.module[modul];
        if (Array.isArray(modulePol)) {
          if (modulePol.includes(aktion)) return true;
        } else if (typeof modulePol === 'object' && modulePol !== null) {
          if (!!modulePol[aktion]) return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error(`Exception inside evaluatePermission for ${modul}:${aktion}:`, err);
    return false;
  }
}
