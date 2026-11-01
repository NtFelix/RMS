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
  | 'organisation'
  | 'api_keys'
  // Kautionsmanagement (GH-6). Bewusst NUR hier und in den Rechte-Editoren der Organisation:
  // Agenten, API-Schlüssel, MCP und OAuth-Consent dürfen das Modul nie erhalten (R2);
  // die Datenbank (check_permission) sperrt diese Kontexte zusätzlich auch für Owner/Admin.
  | 'kautionen';

export type Aktion = 'ansehen' | 'erstellen' | 'bearbeiten' | 'loeschen' | 'verwalten';

/**
 * `code` in the body of an API answer 403 that stems from a failed permission check (see requireApiPermission), as
 * opposed to a 403 of something else in front of the route (proxy, firewall). Clients that treat "no right" as a
 * normal state (empty list instead of an error) rely on it.
 */
export const API_PERMISSION_DENIED_CODE = 'PERMISSION_DENIED';

/**
 * `code` in the body of an API answer 503 when the permission check itself failed (database timeout, failed lookup of
 * the organisation, exception), as opposed to PERMISSION_DENIED ("the right is missing"). Access stays denied in both
 * cases; the code only tells a client that a retry can help.
 */
export const API_PERMISSION_CHECK_FAILED_CODE = 'PERMISSION_CHECK_FAILED';

/** Fixed text of the 503 answer (no internal details of the failed lookup) */
export const API_PERMISSION_CHECK_FAILED_MESSAGE = 'Permission check failed';

/**
 * Result of a permission check:
 * - `allowed`: the right is granted.
 * - `denied`:  the right is missing (or there is no usable membership / no user).
 * - `error`:   the check itself failed (query error, exception), so there is NO decision. Callers must treat it like
 *              `denied` for access (fail-closed); the difference only serves the message and a possible retry.
 */
export type PermissionCheckResult = 'allowed' | 'denied' | 'error';

/**
 * Thrown by requireApiPermission when the check itself failed (result `error`). Access is denied, like for a missing
 * right. `message` is deliberately still 'Permission denied': the many routes that map that message to 403 (and do not
 * know this class yet) answer exactly as before; routes that handle it (apiPermissionErrorResponse) answer 503 with
 * API_PERMISSION_CHECK_FAILED_CODE instead.
 */
export class PermissionCheckError extends Error {
  constructor() {
    super('Permission denied');
    this.name = 'PermissionCheckError';
  }
}

/**
 * Same decision as evaluatePermission, but tells "the right is missing" apart from "the check failed".
 * Designed to be dependency-free so it is safe to use in Edge runtime/middleware.
 *
 * Wherever a query fails or throws, this returns `error`; every other path returns `allowed` or `denied`. This includes
 * the query of the member override: it can revoke a right, so a failed override query must not fall back to the
 * policies (the former implementation did, and could grant a right the override had taken away).
 */
export async function evaluatePermissionResult(
  supabase: any,
  userId: string,
  orgId: string | null,
  modul: Modul,
  aktion: Aktion
): Promise<PermissionCheckResult> {
  if (!userId || !orgId) return 'denied';

  try {
    // 1. Fetch membership details
    const { data: membership, error: memError } = await supabase
      .from('Organisation_Mitglieder')
      .select('id, rolle, status, Organisation(ist_versteckt, owner_id)')
      .eq('organisation_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memError) {
      console.error(`Error fetching membership inside evaluatePermission for ${modul}:${aktion}:`, memError);
      return 'error';
    }
    if (!membership || membership.status !== 'aktiv') {
      return 'denied';
    }

    // Bypass check if it is a personal/hidden organization owned by the user
    const org = membership.Organisation as any;
    if (org && org.ist_versteckt === true && org.owner_id === userId) {
      return 'allowed';
    }

    // Owners and Admins have implicit full access to all modules and actions
    if (membership.rolle === 'owner' || membership.rolle === 'admin') {
      return 'allowed';
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

    // An override can take a right away that the policies grant (e.g. `module.wohnungen: []`). If its query failed we
    // cannot know whether such an override exists, so there is no decision: fail-closed instead of falling through to
    // the policies. No override row is not an error (maybeSingle yields data null, error null).
    if (overrideError) {
      console.error(`Error fetching member override inside evaluatePermission for ${modul}:${aktion}:`, overrideError);
      return 'error';
    }
    if (override && override.berechtigungen) {
      const overrideB = override.berechtigungen as any;
      if (overrideB.module && overrideB.module[modul] !== undefined) {
        const moduleOver = overrideB.module[modul];
        if (Array.isArray(moduleOver)) {
          return moduleOver.includes(aktion) ? 'allowed' : 'denied';
        } else if (typeof moduleOver === 'object' && moduleOver !== null) {
          return moduleOver[aktion] ? 'allowed' : 'denied';
        }
      }
    }

    if (policiesError) {
      console.error(`Error fetching member policies inside evaluatePermission for ${modul}:${aktion}:`, policiesError);
      return 'error';
    }
    if (!memberPolicies || memberPolicies.length === 0) {
      return 'denied';
    }

    const policyIds = memberPolicies.map((mp: any) => mp.policy_id);

    const { data: policies, error: policiesQueryError } = await supabase
      .from('Organisation_Policies')
      .select('berechtigungen')
      .in('id', policyIds)
      .eq('organisation_id', orgId);

    if (policiesQueryError) {
      console.error(`Error fetching policies inside evaluatePermission for ${modul}:${aktion}:`, policiesQueryError);
      return 'error';
    }
    if (!policies) {
      return 'denied';
    }

    // OR logic across all assigned policies
    for (const policy of policies) {
      const policyB = policy.berechtigungen as any;
      if (policyB && policyB.module && policyB.module[modul]) {
        const modulePol = policyB.module[modul];
        if (Array.isArray(modulePol)) {
          if (modulePol.includes(aktion)) return 'allowed';
        } else if (typeof modulePol === 'object' && modulePol !== null) {
          if (!!modulePol[aktion]) return 'allowed';
        }
      }
    }

    return 'denied';
  } catch (err) {
    console.error(`Exception inside evaluatePermission for ${modul}:${aktion}:`, err);
    return 'error';
  }
}

/**
 * Direct evaluation of permission logic in TypeScript to handle both
 * canonical array format and legacy boolean key-value formats.
 * Fail-closed: only `allowed` is true; a missing right and a failed check are both false (use
 * evaluatePermissionResult to tell them apart).
 * Designed to be dependency-free so it is safe to use in Edge runtime/middleware.
 */
export async function evaluatePermission(
  supabase: any,
  userId: string,
  orgId: string | null,
  modul: Modul,
  aktion: Aktion
): Promise<boolean> {
  return (await evaluatePermissionResult(supabase, userId, orgId, modul, aktion)) === 'allowed';
}
