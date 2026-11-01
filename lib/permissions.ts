import { ensureAuth } from "@/lib/auth-utils";
import { redirect, unstable_rethrow } from "next/navigation";

import { evaluatePermission, evaluatePermissionResult, type Modul, type Aktion, type PermissionCheckResult } from "./permissions-core";
export { evaluatePermission, evaluatePermissionResult, type Modul, type Aktion, type PermissionCheckResult };

/**
 * Checks the permission of the current authenticated user for a module and action and tells "the right is missing"
 * (`denied`) apart from "the check itself failed" (`error`: failed lookup of the organisation, database error,
 * exception). `error` is NO decision: callers must deny access for it as for `denied` (fail-closed) and may only
 * change the message / offer a retry.
 *
 * Not authenticated counts as `denied` (as before: it was false), because the failure of the session lookup cannot be
 * told apart from "no session" here.
 */
export async function checkPermission(modul: Modul, aktion: Aktion): Promise<PermissionCheckResult> {
  try {
    let auth: Awaited<ReturnType<typeof ensureAuth>>;
    try {
      auth = await ensureAuth();
    } catch (authError) {
      unstable_rethrow(authError);
      console.error(`Exception checking permission for ${modul}:${aktion}:`, authError);
      return 'denied';
    }
    const { supabase, user } = auth;

    // Resolve current organisation ID
    const { data: orgId, error: orgError } = await supabase.rpc('current_organisation_id');
    if (orgError) {
      console.error(`Error fetching current_organisation_id for hasPermission:`, orgError);
      return 'error';
    }

    if (!orgId) {
      return 'allowed'; // Personal accounts have full access
    }

    return await evaluatePermissionResult(supabase, user.id, orgId, modul, aktion);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`Exception checking permission for ${modul}:${aktion}:`, error);
    return 'error';
  }
}

/**
 * Checks if the current authenticated user has permission for a specific module and action.
 * Fail-closed: returns false if not authenticated or if an error occurs (use checkPermission to tell a failed check
 * apart from a missing right).
 */
export async function hasPermission(modul: Modul, aktion: Aktion): Promise<boolean> {
  return (await checkPermission(modul, aktion)) === 'allowed';
}

/**
 * Enforces permission check. If the user does not have permission,
 * it redirects to /unauthorized.
 */
export async function requirePermission(modul: Modul, aktion: Aktion): Promise<void> {
  const allowed = await hasPermission(modul, aktion);
  if (!allowed) {
    redirect("/unauthorized");
  }
}

/**
 * Checks if the current user is an owner or admin in the active organization.
 */
export async function isOrgAdminOrOwner(): Promise<boolean> {
  try {
    const { supabase } = await ensureAuth();
    const { data: isAdmin, error } = await supabase.rpc('is_org_admin_or_owner');
    if (error) {
      console.error("Error checking isOrgAdminOrOwner:", error);
      return false;
    }
    return !!isAdmin;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Exception checking isOrgAdminOrOwner:", error);
    return false;
  }
}

