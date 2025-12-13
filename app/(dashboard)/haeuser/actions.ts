"use server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { logAction } from '@/lib/logging-middleware';

// Update function signature to accept id as the first parameter
// Define the expected fields and their types
interface HouseData {
  name: string;
  ort: string;
  strasse?: string | null;
  groesse: number | null;
}

export async function handleSubmit(id: string | null, formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const actionName = id ? 'updateHouse' : 'createHouse';
  const houseName = formData.get('name')?.toString() || 'unknown';

  logAction(actionName, 'start', { ...(id && { house_id: id }), house_name: houseName });

  const supabase = await createSupabaseServerClient();

  try {
    // Process groesse field
    const groesseValue = formData.get("groesse");
    let processedGroesse: number | null = null;

    if (typeof groesseValue === 'string' && groesseValue.trim() !== '') {
      const num = parseFloat(groesseValue);
      if (!isNaN(num)) {
        processedGroesse = num;
      }
    }

    // Get form data
    const name = formData.get('name')?.toString();
    const ort = formData.get('ort')?.toString() || '';

    // Validate required field
    if (!name) {
      logAction(actionName, 'failed', { ...(id && { house_id: id }), error_message: 'Name ist ein Pflichtfeld.' });
      return { success: false, error: { message: 'Name ist ein Pflichtfeld.' } };
    }

    // Explicitly pick only the expected fields
    const houseData: HouseData = {
      name,
      ort,
      strasse: formData.get('strasse')?.toString() || null,
      groesse: processedGroesse,
    };

    if (id) {
      const { error } = await supabase
        .from("Haeuser")
        .update(houseData)
        .eq("id", id);

      if (error) {
        logAction(actionName, 'error', { house_id: id, house_name: houseName, error_message: error.message });
        return { success: false, error: { message: error.message } };
      }
    } else {
      const { error: insertError } = await supabase
        .from("Haeuser")
        .insert(houseData);

      if (insertError) {
        logAction(actionName, 'error', { house_name: houseName, error_message: insertError.message });
        return { success: false, error: { message: insertError.message } };
      }
    }
    revalidatePath("/haeuser");
    logAction(actionName, 'success', { ...(id && { house_id: id }), house_name: houseName });
    return { success: true };
  } catch (e) {
    logAction(actionName, 'error', { ...(id && { house_id: id }), house_name: houseName, error_message: (e as Error).message });
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function deleteHouseAction(houseId: string): Promise<{ success: boolean; error?: { message: string } }> {
  const actionName = 'deleteHouse';
  logAction(actionName, 'start', { house_id: houseId });

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("Haeuser")
      .delete()
      .eq("id", houseId);

    if (error) {
      logAction(actionName, 'error', { house_id: houseId, error_message: error.message });
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/haeuser');
    logAction(actionName, 'success', { house_id: houseId });
    return { success: true };

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { house_id: houseId, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

// Added imports for the new action
import { fetchWasserzaehlerModalData, Mieter, Wasserzaehler } from "@/lib/data-fetching";

export async function getWasserzaehlerModalDataLegacyAction(nebenkostenId: string): Promise<{ mieterList: Mieter[]; existingReadings: Wasserzaehler[] }> {
  try {
    const data = await fetchWasserzaehlerModalData(nebenkostenId);
    return data;
  } catch (error) {
    console.error("Error in getWasserzaehlerModalDataLegacyAction:", error);
    // Return empty data on error, consistent with fetchWasserzaehlerModalData's own error handling for some cases.
    return { mieterList: [], existingReadings: [] };
  }
}

