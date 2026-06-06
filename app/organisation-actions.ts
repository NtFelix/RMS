"use server";

import { createClient } from "@/utils/supabase/server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { withLogging } from "@/lib/logging-middleware";

/**
 * Invites a new member to the current organization.
 */
export const createEinladungAction = withLogging(
  'createEinladung',
  async (
    email: string,
    rolle: string
  ): Promise<{ success: boolean; data?: any; error?: { message: string } }> => {
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

    const { data, error } = await supabase.rpc('create_einladung', {
      p_email: email,
      p_rolle: rolle,
      p_policy_ids: null
    });

    if (error) {
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/organisation');
    return { success: true, data };
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
