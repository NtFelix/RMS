"use server";
import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';

// Update function signature to accept id as the first parameter
// Define the expected fields and their types
interface HouseData {
  name: string;
  ort: string;
  strasse?: string | null;
  groesse: number | null;
  user_id?: string;
}

export async function handleSubmit(id: string | null, formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const actionName = id ? 'updateHouse' : 'createHouse';
  const houseName = formData.get('name')?.toString() || 'unknown';

  logAction(actionName, 'start', { ...(id && { house_id: id }), house_name: houseName });

  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }

  // Permission & scope checks
  const { hasPermission } = await import("@/lib/permissions");
  const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
  
  if (id) {
    if (!(await hasPermission('haeuser', 'bearbeiten'))) {
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    const haeuserIds = await getAccessibleHaeuserIds();
    if (haeuserIds !== null && !haeuserIds.includes(id)) {
      return { success: false, error: { message: "Zugriff auf dieses Haus verweigert." } };
    }
  } else {
    if (!(await hasPermission('haeuser', 'erstellen'))) {
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
  }

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
      const { data: newHouse, error: insertError } = await supabase
        .from("Haeuser")
        .insert(houseData)
        .select('id')
        .single();

      if (insertError || !newHouse) {
        logAction(actionName, 'error', { house_name: houseName, error_message: insertError?.message || 'No data returned' });
        return { success: false, error: { message: insertError?.message || 'Fehler beim Erstellen des Hauses.' } };
      }

      // Auto-grant scope access for restricted members
      const haeuserIds = await getAccessibleHaeuserIds();
      if (haeuserIds !== null) {
        // User has restricted scope → add the new house to their override
        const { error: scopeError } = await supabase.rpc('add_house_to_member_scope', {
          p_house_id: newHouse.id,
        });
        if (scopeError) {
          console.error('Failed to auto-grant scope for new house:', scopeError);
        }
      }

      try {
        const posthog = getPostHogServer();
        await posthog.capture({
          distinctId: user.id,
          event: 'house_created',
          properties: {
            house_id: newHouse.id,
            house_name: name,
            has_location: !!ort,
            has_size: processedGroesse !== null,
            source: 'server_action',
          },
        });
        await posthog.flush();
      } catch (phError) {
        console.error('[PostHog] Failed to capture house_created:', phError);
      }
    }
    revalidatePath("/haeuser");
    logAction(actionName, 'success', { ...(id && { house_id: id }), house_name: houseName });
    return { success: true };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown server error occurred";
    logAction(actionName, 'error', { ...(id && { house_id: id }), house_name: houseName, error_message: errorMessage });
    return { success: false, error: { message: errorMessage } };
  }
}

export async function deleteHouseAction(houseId: string): Promise<{ success: boolean; error?: { message: string } }> {
  const actionName = 'deleteHouse';
  logAction(actionName, 'start', { house_id: houseId });

  try {
    const { user, supabase } = await ensureAuth();

    // Permission & scope checks
    const { hasPermission } = await import("@/lib/permissions");
    const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
    
    if (!(await hasPermission('haeuser', 'loeschen'))) {
      return { success: false, error: { message: "Keine Berechtigung" } };
    }
    const haeuserIds = await getAccessibleHaeuserIds();
    if (haeuserIds !== null && !haeuserIds.includes(houseId)) {
      return { success: false, error: { message: "Zugriff auf dieses Haus verweigert." } };
    }

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



