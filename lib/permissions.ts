import { ensureAuth } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

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
 * Checks if the current authenticated user has permission for a specific module and action.
 * Fail-closed: returns false if not authenticated or if an error occurs.
 */
export async function hasPermission(modul: Modul, aktion: Aktion): Promise<boolean> {
  try {
    const { supabase } = await ensureAuth();
    
    // Any active member of an organization has read access ('ansehen') to the organization page
    if (modul === 'organisation' && aktion === 'ansehen') {
      const { data: orgId, error: orgIdError } = await supabase.rpc('current_organisation_id');
      if (orgIdError) {
        console.error("Error fetching current_organisation_id in hasPermission:", orgIdError);
        return false;
      }
      return orgId !== null;
    }

    const { data, error } = await supabase.rpc('check_permission', {
      p_modul: modul,
      p_aktion: aktion,
    });
    
    if (error) {
      console.error(`Error in check_permission RPC for ${modul}:${aktion}:`, error);
      return false;
    }
    
    return data === true;
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
