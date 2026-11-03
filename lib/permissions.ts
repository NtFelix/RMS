import { ensureAuth } from "@/lib/auth-utils";
import { isNotAuthenticatedError } from "@/lib/auth-errors";
import { redirect, unstable_rethrow } from "next/navigation";

import { evaluatePermission, evaluatePermissionResult, type Modul, type Aktion, type PermissionCheckResult } from "./permissions-core";
export { evaluatePermission, type Modul, type Aktion };

/**
 * Checks the permission of the current authenticated user for a module and action and tells "the right is missing"
 * (`denied`) apart from "the check itself failed" (`error`: failed lookup of the organisation, database error,
 * exception). `error` is NO decision: callers must deny access for it as for `denied` (fail-closed) and may only
 * change the message / offer a retry.
 *
 * Not signed in (no valid session) counts as `denied`, as before (it was false). If the lookup of the user itself fails
 * technically (auth service unreachable, 5xx, rate limit, see AuthLookupError), that is an `error`, not "not signed in".
 *
 * Every failed check is logged exactly once, by whoever detects it (here, or evaluatePermissionResult, which catches
 * its own failures and never throws), so this function adds no second line for an `error` it merely passes on.
 */
export async function checkPermission(modul: Modul, aktion: Aktion): Promise<PermissionCheckResult> {
  try {
    let auth: Awaited<ReturnType<typeof ensureAuth>>;
    try {
      auth = await ensureAuth();
    } catch (authError) {
      unstable_rethrow(authError);
      if (isNotAuthenticatedError(authError)) return 'denied';
      console.error(`Permission check ${modul}:${aktion} failed (user lookup):`, authError);
      return 'error';
    }
    const { supabase, user } = auth;

    // Resolve current organisation ID
    const { data: orgId, error: orgError } = await supabase.rpc('current_organisation_id');
    if (orgError) {
      console.error(`Permission check ${modul}:${aktion} failed (current_organisation_id lookup):`, orgError);
      return 'error';
    }

    if (!orgId) {
      return 'allowed'; // Personal accounts have full access
    }

    return await evaluatePermissionResult(supabase, user.id, orgId, modul, aktion);
  } catch (error) {
    unstable_rethrow(error);
    console.error(`Permission check ${modul}:${aktion} failed (unexpected exception):`, error);
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
 * Checks if the current user is an owner or admin in the active organisation (database function
 * `is_org_admin_or_owner`: role owner/admin and active membership) and tells "no admin" (`denied`) apart from "the check
 * itself failed" (`error`), like checkPermission. `error` is NO decision: callers must deny access for it (fail-closed).
 *
 * Unlike checkPermission this is a pure role check: it does not look at module rights, and a user without an active
 * organisation is `denied` (the database function returns false then). Not signed in is `denied`; a technically failed
 * user lookup (AuthLookupError) is an `error`.
 */
export async function checkOrgAdminOrOwner(): Promise<PermissionCheckResult> {
  try {
    let auth: Awaited<ReturnType<typeof ensureAuth>>;
    try {
      auth = await ensureAuth();
    } catch (authError) {
      unstable_rethrow(authError);
      if (isNotAuthenticatedError(authError)) return 'denied';
      console.error("Error checking isOrgAdminOrOwner (user lookup):", authError);
      return 'error';
    }
    const { data: isAdmin, error } = await auth.supabase.rpc('is_org_admin_or_owner');
    if (error) {
      console.error("Error checking isOrgAdminOrOwner:", error);
      return 'error';
    }
    return isAdmin === true ? 'allowed' : 'denied';
  } catch (error) {
    unstable_rethrow(error);
    console.error("Exception checking isOrgAdminOrOwner:", error);
    return 'error';
  }
}

/**
 * Checks if the current user is an owner or admin in the active organization.
 * Fail-closed: false if not authenticated or if the check fails (use checkOrgAdminOrOwner to tell those apart).
 */
export async function isOrgAdminOrOwner(): Promise<boolean> {
  return (await checkOrgAdminOrOwner()) === 'allowed';
}

