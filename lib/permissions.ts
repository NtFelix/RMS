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
