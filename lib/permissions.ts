import { ensureAuth } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

import { evaluatePermission, type Modul, type Aktion } from "./permissions-core";
export { evaluatePermission, type Modul, type Aktion };

/**
 * Checks if the current authenticated user has permission for a specific module and action.
 * Fail-closed: returns false if not authenticated or if an error occurs.
 */
export async function hasPermission(modul: Modul, aktion: Aktion): Promise<boolean> {
  try {
    const { supabase, user } = await ensureAuth();
    
    // Resolve current organisation ID
    const { data: orgId, error: orgError } = await supabase.rpc('current_organisation_id');
    if (orgError) {
      console.error(`Error fetching current_organisation_id for hasPermission:`, orgError);
      return false;
    }

    return await evaluatePermission(supabase, user.id, orgId, modul, aktion);
  } catch (error) {
    console.error(`Exception checking permission for ${modul}:${aktion}:`, error);
    return false;
  }
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
