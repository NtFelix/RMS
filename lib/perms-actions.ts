"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { MemberPermissions, HausWithWohnungen, MemberBerechtigungen } from "@/lib/organisation-types";

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
  return data as MemberPermissions;
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
