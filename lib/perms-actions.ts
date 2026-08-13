"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { MemberPermissions, HausWithWohnungen, MemberBerechtigungen } from "@/lib/organisation-types";

/**
 * Fetches the permissions for a specific member (owner/admin only).
 *
 * The returned `module` object uses the canonical array format:
 *   { haeuser: ["ansehen", "erstellen"], mieter: ["ansehen"] }
 * This matches exactly what get_mitglied_permissions returns and what the UI
 * ModulePermissionEditor and ObjectScopeEditor consume.
 *
 * No conversion needed — the DB stores and returns the array format natively.
 * check_permission() correctly reads this format (uses JSONB array containment).
 */
export async function getMitgliedPermissionsAction(mitgliedId: string): Promise<MemberPermissions> {
  const supabase = await createClient();
  await requirePermission('organisation', 'ansehen');
  const { data, error } = await supabase.rpc('get_mitglied_permissions', {
    p_mitglied_id: mitgliedId,
  });
  if (error) {
    console.error("Error in get_mitglied_permissions RPC:", error);
    throw error;
  }
  const permissions = data as MemberPermissions;
  // The get_mitglied_permissions RPC can omit policy_ids entirely (e.g. a
  // mitarbeiter with no policies assigned). Default it so the rest of the
  // component can trust the MemberPermissions type.
  return { ...permissions, policy_ids: permissions?.policy_ids ?? [] };
}

export async function getOrgHaeuserAction(): Promise<HausWithWohnungen[]> {
  const supabase = await createClient();
  await requirePermission('organisation', 'ansehen');
  const { data, error } = await supabase.rpc('get_org_haeuser_mit_wohnungen');
  if (error) {
    console.error("Error in get_org_haeuser_mit_wohnungen RPC:", error);
    throw error;
  }
  return (data ?? []) as HausWithWohnungen[];
}

/**
 * Saves per-member permission overrides (owner/admin only).
 *
 * The `berechtigungen` argument uses the canonical array format:
 *   { module: { haeuser: ["ansehen", "erstellen"] }, objekte: { haeuser: [uuid, ...] } }
 * Passed directly to set_mitglied_overrides without any conversion.
 */
export async function setMitgliedOverridesAction(
  mitgliedId: string,
  berechtigungen: MemberBerechtigungen
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await requirePermission('organisation', 'verwalten');
    const { error } = await supabase.rpc('set_mitglied_overrides', {
      p_mitglied_id: mitgliedId,
      p_berechtigungen: berechtigungen,
    });
    if (error) {
      console.error("Error in set_mitglied_overrides RPC:", error);
      return { success: false, error: error.message };
    }
    revalidatePath('/organisation');
    return { success: true };
  } catch (err: any) {
    console.error("Exception in setMitgliedOverridesAction:", err);
    return { success: false, error: err.message || "Unbekannter Fehler" };
  }
}
