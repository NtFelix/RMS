"use server";

import { createClient } from "@/utils/supabase/server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { withLogging } from "@/lib/logging-middleware";
import { sendEinladungEmail } from "@/lib/email/sendEinladungEmail";
import { cookies } from "next/headers";
import { safeRpcCall } from "@/lib/error-handling";
import { logger } from "@/utils/logger";
import { posthogLogger } from "@/lib/posthog-logger";



/**
 * Invites a new member to the current organization.
 */
export const createEinladungAction = withLogging(
  'createEinladung',
  async (
    email: string,
    rolle: string
  ): Promise<{ success: boolean; data?: any; error?: { message: string }; email?: { sent: boolean; error?: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    if (!(await hasPermission('organisation', 'verwalten'))) {
      return { success: false, error: { message: "Keine Berechtigung zum Verwalten der Organisation." } };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: { message: "Ungültige E-Mail-Adresse." } };
    }

    if (rolle !== 'admin' && rolle !== 'mitarbeiter') {
      return { success: false, error: { message: "Ungültige Rolle." } };
    }

    const { data, error } = await supabase.rpc('create_einladung', {
      p_email: email,
      p_rolle: rolle,
      p_policy_ids: null
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    // Send invitation email (fire-and-forget — DB invite is already the source of truth).
    let emailResult: { sent: boolean; error?: string } = { sent: false };
    if (data?.token) {
      try {
        let orgName = 'Mietevo';
        if (data?.organisation_id) {
          const { data: org } = await supabase
            .from('Organisation')
            .select('einstellungen')
            .eq('id', data.organisation_id)
            .single();
          orgName = (org?.einstellungen as { name?: string } | null)?.name ?? 'Mietevo';
        }

        const einladerName = user.email ?? 'Ein Administrator';

        emailResult = await sendEinladungEmail({
          toEmail: email,
          einladerName,
          organisationsName: orgName,
          rolle: rolle as 'admin' | 'mitarbeiter',
          token: data.token,
        });
      } catch (emailError: unknown) {
        const msg = emailError instanceof Error ? emailError.message : String(emailError);
        console.error("[createEinladungAction] Email sending failed:", msg);
        emailResult = { sent: false, error: `E-Mail-Versand fehlgeschlagen: ${msg}` };
      }
    }

    revalidatePath('/organisation');
    return { success: true, data, email: emailResult };
  }
);

/**
 * Revokes an open invitation.
 */
export const revokeEinladungAction = withLogging(
  'revokeEinladung',
  async (
    einladungId: string
  ): Promise<{ success: boolean; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    if (!(await hasPermission('organisation', 'verwalten'))) {
      return { success: false, error: { message: "Keine Berechtigung zum Verwalten der Organisation." } };
    }

    const { error } = await supabase.rpc('revoke_einladung', {
      p_einladung_id: einladungId
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/organisation');
    return { success: true };
  }
);

/**
 * Changes a member's role.
 */
export const setMitgliedRolleAction = withLogging(
  'setMitgliedRolle',
  async (
    mitgliedId: string,
    rolle: string
  ): Promise<{ success: boolean; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    if (!(await hasPermission('organisation', 'verwalten'))) {
      return { success: false, error: { message: "Keine Berechtigung zum Verwalten der Organisation." } };
    }

    if (rolle !== 'admin' && rolle !== 'mitarbeiter') {
      return { success: false, error: { message: "Ungültige Rolle." } };
    }

    const { error } = await supabase.rpc('set_mitglied_rolle', {
      p_mitglied_id: mitgliedId,
      p_rolle: rolle
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/organisation');
    return { success: true };
  }
);

/**
 * Updates a member's status (aktiv, deaktiviert, etc.).
 */
export const setMitgliedStatusAction = withLogging(
  'setMitgliedStatus',
  async (
    mitgliedId: string,
    status: string
  ): Promise<{ success: boolean; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    if (!(await hasPermission('organisation', 'verwalten'))) {
      return { success: false, error: { message: "Keine Berechtigung zum Verwalten der Organisation." } };
    }

    if (status !== 'aktiv' && status !== 'deaktiviert') {
      return { success: false, error: { message: "Ungültige Statusänderung." } };
    }

    const { error } = await supabase.rpc('set_mitglied_status', {
      p_mitglied_id: mitgliedId,
      p_status: status
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/organisation');
    return { success: true };
  }
);

/**
 * Removes a member from the organization.
 */
export const removeMitgliedAction = withLogging(
  'removeMitglied',
  async (
    mitgliedId: string
  ): Promise<{ success: boolean; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    if (!(await hasPermission('organisation', 'verwalten'))) {
      return { success: false, error: { message: "Keine Berechtigung zum Verwalten der Organisation." } };
    }

    const { error } = await supabase.rpc('remove_mitglied', {
      p_mitglied_id: mitgliedId
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/organisation');
    return { success: true };
  }
);

/**
 * Fetches all organisations the current user is active in, plus the active organisation ID.
 * Features RPC-to-SQL fallback and logger integration.
 */
export const getMyOrganisationsAction = withLogging(
  'getMyOrganisations',
  async (): Promise<{ success: boolean; data?: any; currentOrgId?: string | null; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    let orgs: any[] = [];
    let currentOrgId: string | null = null;

    // 1. Try to fetch organisations using the get_my_organisations RPC
    const orgsResult = await safeRpcCall<any[]>(supabase, 'get_my_organisations', undefined, { userId: user.id });
    if (orgsResult.success && orgsResult.data) {
      // Exclude personal organization from the shared list
      orgs = orgsResult.data.filter((org: any) => org.owner_id !== user.id);
      posthogLogger.info('get_my_organisations RPC succeeded', {
        'rpc.function': 'get_my_organisations',
        'user_id': user.id,
        'orgs.count': orgs.length
      });
    } else {
      logger.warn('get_my_organisations RPC failed, falling back to manual querying', {
        userId: user.id,
        message: orgsResult.message
      });
      posthogLogger.warn('get_my_organisations RPC failed, falling back to manual querying', {
        'rpc.function': 'get_my_organisations',
        'user_id': user.id,
        'error.message': orgsResult.message
      });

      // Fallback query to public tables directly
      const { data: omData, error: omError } = await supabase
        .from('Organisation_Mitglieder')
        .select(`
          organisation_id,
          rolle,
          Organisation:organisation_id (
            id,
            owner_id,
            ist_versteckt,
            einstellungen
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'aktiv');

      if (omError) {
        logger.error('Fallback query to Organisation_Mitglieder failed', omError, { userId: user.id });
        posthogLogger.error('Fallback query to Organisation_Mitglieder failed', {
          'user_id': user.id,
          'error.message': omError.message,
          'error.code': omError.code
        });
        return { success: false, error: { message: omError.message } };
      }

      for (const membership of omData || []) {
        const org: any = membership.Organisation;
        if (!org) continue;

        // Skip personal/private organization in the switcher dropdown list
        if (org.ist_versteckt === true && org.owner_id === user.id) {
          continue;
        }

        let name = org.einstellungen?.name;
        if (!name) {
          if (org.owner_id === user.id) {
            const vorname = user.user_metadata?.vorname;
            const emailPrefix = user.email ? user.email.split('@')[0] : null;
            name = (vorname || emailPrefix || 'Meine') + "' Organisation";
          } else {
            name = 'Organisation';
          }
        }

        orgs.push({
          organisation_id: org.id,
          owner_id: org.owner_id,
          rolle: membership.rolle,
          name: name
        });
      }

      // Sort alphabetically by name
      orgs.sort((a, b) => a.name.localeCompare(b.name));
      posthogLogger.info('get_my_organisations manual fallback query succeeded', {
        'user_id': user.id,
        'orgs.count': orgs.length
      });
    }

    // 2. Try to fetch the active organisation ID
    const currentOrgResult = await safeRpcCall<string | null>(supabase, 'current_organisation_id', undefined, { userId: user.id });
    if (currentOrgResult.success) {
      currentOrgId = currentOrgResult.data ?? null;
      posthogLogger.info('current_organisation_id RPC succeeded', {
        'rpc.function': 'current_organisation_id',
        'user_id': user.id,
        'active.org_id': currentOrgId
      });
    } else {
      logger.warn('current_organisation_id RPC failed, falling back to cookie lookup', {
        userId: user.id,
        message: currentOrgResult.message
      });
      posthogLogger.warn('current_organisation_id RPC failed, falling back to cookie lookup', {
        'rpc.function': 'current_organisation_id',
        'user_id': user.id,
        'error.message': currentOrgResult.message
      });

      // Fallback to reading cookie directly on the server side
      const cookieStore = await cookies();
      const cookieVal = cookieStore.get('current_organisation_id')?.value || null;
      currentOrgId = (cookieVal && cookieVal !== 'null' && cookieVal !== 'private') ? cookieVal : null;
      posthogLogger.info('current_organisation_id resolved via cookie fallback', {
        'user_id': user.id,
        'cookie.value': cookieVal,
        'resolved.org_id': currentOrgId
      });
    }

    // Represent the user's personal organization as null to the UI (so "Privat" gets the checkmark)
    if (currentOrgId) {
      const { data: orgData, error } = await supabase
        .from('Organisation')
        .select('ist_versteckt, owner_id')
        .eq('id', currentOrgId)
        .maybeSingle();
      if (error) {
        logger.error('Failed to check personal organisation', error, { userId: user.id, currentOrgId });
      } else if (orgData && orgData.ist_versteckt && orgData.owner_id === user.id) {
        currentOrgId = null;
      }
    }

    return { success: true, data: orgs, currentOrgId };
  }
);

/**
 * Switches the current organisation context (updates the database and sets the cookie).
 * Features RPC-to-SQL fallback and logger integration.
 */
export const switchOrganisationAction = withLogging(
  'switchOrganisation',
  async (orgId: string | null): Promise<{ success: boolean; error?: { message: string } }> => {
    let user, supabase;
    try {
      ({ user, supabase } = await ensureAuth());
    } catch (authError: unknown) {
      const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
      return { success: false, error: { message: errorMessage } };
    }

    // 1. Try to set current organisation using set_current_organisation RPC
    const dbResult = await safeRpcCall<boolean>(
      supabase,
      'set_current_organisation',
      { p_org_id: orgId },
      { userId: user.id }
    );

    if (dbResult.success) {
      posthogLogger.info('set_current_organisation RPC succeeded', {
        'rpc.function': 'set_current_organisation',
        'user_id': user.id,
        'target.org_id': orgId
      });
    } else {
      const errorMessageText = (dbResult.error?.message || dbResult.message || '').toLowerCase();
      const isMissingFunction = dbResult.error?.code === '42883' || 
                               dbResult.error?.code === 'PGRST202' || 
                               dbResult.error?.code === 'PGRST200' ||
                               errorMessageText.includes('does not exist') ||
                               errorMessageText.includes('not found') ||
                               errorMessageText.includes('unrecognized signature') ||
                               errorMessageText.includes('existiert nicht');

      if (isMissingFunction) {
        logger.error('set_current_organisation RPC is missing in the database', undefined, {
          userId: user.id,
          orgId: orgId || undefined,
          code: dbResult.error?.code,
          message: dbResult.error?.message
        });
        return { 
          success: false, 
          error: { 
            message: 'Die Datenbank-Funktion set_current_organisation existiert nicht. Bitte wenden Sie sich an den Administrator.' 
          } 
        };
      }

      logger.warn('set_current_organisation RPC failed, falling back to manual validation', {
        userId: user.id,
        orgId,
        message: dbResult.message
      });
      posthogLogger.warn('set_current_organisation RPC failed, falling back to manual validation', {
        'rpc.function': 'set_current_organisation',
        'user_id': user.id,
        'target.org_id': orgId,
        'error.message': dbResult.message
      });

      // Manual fallback check for switching context
      if (orgId) {
        const { data: membership, error: membershipError } = await supabase
          .from('Organisation_Mitglieder')
          .select('id')
          .eq('organisation_id', orgId)
          .eq('user_id', user.id)
          .eq('status', 'aktiv')
          .maybeSingle();

        if (membershipError) {
          logger.error('Manual validation of membership failed', membershipError, { userId: user.id, orgId });
          posthogLogger.error('Manual validation of membership failed', {
            'user_id': user.id,
            'target.org_id': orgId,
            'error.message': membershipError.message,
            'error.code': membershipError.code
          });
          return { success: false, error: { message: membershipError.message } };
        }

        if (!membership) {
          posthogLogger.warn('Switch validation failed: User is not an active member', {
            'user_id': user.id,
            'target.org_id': orgId
          });
          return { success: false, error: { message: 'User ist kein aktives Mitglied dieser Organisation' } };
        }

        posthogLogger.info('Manual validation of membership succeeded', {
          'user_id': user.id,
          'target.org_id': orgId
        });
      }
    }

    // 2. Persist the cookie on the Next.js server-side
    const cookieStore = await cookies();
    if (orgId) {
      cookieStore.set('current_organisation_id', orgId, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      posthogLogger.info('Persisted current_organisation_id cookie to orgId', {
        'user_id': user.id,
        'target.org_id': orgId
      });
    } else {
      cookieStore.set('current_organisation_id', 'private', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      posthogLogger.info('Persisted current_organisation_id cookie to private', {
        'user_id': user.id
      });
    }

    // Revalidate path
    revalidatePath('/');
    return { success: true };
  }
);


