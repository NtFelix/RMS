"use server";

import { createClient } from "@/utils/supabase/server";
import { requirePermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { MemberPermissions, HausWithWohnungen, MemberBerechtigungen } from "@/lib/organisation-types";

const ALL_AKTIONEN = ["ansehen", "erstellen", "bearbeiten", "loeschen", "verwalten"] as const;

/**
 * Converts the UI's array format to the DB's boolean-map format.
 * UI:  { haeuser: ["ansehen", "erstellen"] }
 * DB:  { haeuser: { "ansehen": true, "erstellen": true, "bearbeiten": false, ... } }
 */
function moduleArrayToDbBooleanMap(
  uiModule: Record<string, string[]> | undefined
): Record<string, Record<string, boolean>> | undefined {
  if (!uiModule) return undefined;
  const result: Record<string, Record<string, boolean>> = {};
  for (const [modKey, aktionen] of Object.entries(uiModule)) {
    result[modKey] = {};
    for (const aktion of ALL_AKTIONEN) {
      result[modKey][aktion] = aktionen.includes(aktion);
    }
  }
  return result;
}

/**
 * Converts the DB's boolean-map format back to the UI's array format.
 * DB:  { haeuser: { "ansehen": true, "erstellen": true, "bearbeiten": false } }
 * UI:  { haeuser: ["ansehen", "erstellen"] }
 *
 * Also handles the legacy array format in case the DB stored it directly.
 */
function moduleDbBooleanMapToArray(
  dbModule: Record<string, Record<string, boolean> | string[]> | null | undefined
): Record<string, string[]> | null {
  if (!dbModule) return null;
  const result: Record<string, string[]> = {};
  for (const [modKey, value] of Object.entries(dbModule)) {
    if (Array.isArray(value)) {
      // Legacy: already in array format
      result[modKey] = value as string[];
    } else if (value && typeof value === "object") {
      // Boolean map format (canonical DB format)
      result[modKey] = Object.entries(value)
        .filter(([, granted]) => granted === true)
        .map(([aktion]) => aktion);
    } else {
      result[modKey] = [];
    }
  }
  return result;
}

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
  const raw = data as any;
  return {
    ...raw,
    // Normalize module format from DB boolean-map → UI array format
    module: moduleDbBooleanMapToArray(raw?.module),
  } as MemberPermissions;
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

    // Convert UI array format → DB boolean-map format before saving
    const dbBerechtigungen = {
      ...berechtigungen,
      module: berechtigungen.module
        ? moduleArrayToDbBooleanMap(berechtigungen.module)
        : undefined,
    };

    const { error } = await supabase.rpc('set_mitglied_overrides', {
      p_mitglied_id: mitgliedId,
      p_berechtigungen: dbBerechtigungen,
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
