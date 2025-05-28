"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { Mieter } from "../lib/data-fetching"; // Added import for Mieter type

export async function handleSubmit(formData: FormData): Promise<{ success: boolean; error?: { message: string } }> {
  const supabase = await createClient();
  const payload: any = {
    wohnung_id: formData.get('wohnung_id') || null,
    name: formData.get('name'),
    einzug: formData.get('einzug') || null,
    auszug: formData.get('auszug') || null,
    email: formData.get('email') || null,
    telefonnummer: formData.get('telefonnummer') || null,
    notiz: formData.get('notiz') || null,
    nebenkosten: formData.get('nebenkosten') ? String(formData.get('nebenkosten')).split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n)) : null,
    nebenkosten_datum: formData.get('nebenkosten_datum') ? String(formData.get('nebenkosten_datum')).split(',').map(s => s.trim()).filter(Boolean) : null
  };
  const id = formData.get('id');

  try {
    if (id) {
      const { error } = await supabase.from('Mieter').update(payload).eq('id', id as string);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    } else {
      const { error } = await supabase.from('Mieter').insert(payload);
      if (error) {
        return { success: false, error: { message: error.message } };
      }
    }
    revalidatePath('/mieter');
    return { success: true };
  } catch (e) {
    return { success: false, error: { message: (e as Error).message } };
  }
}

export async function deleteTenantAction(tenantId: string): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("Mieter")
      .delete()
      .eq("id", tenantId);

    if (error) {
      console.error("Error deleting tenant from Supabase:", error);
      return { success: false, error: { message: error.message } };
    }

    revalidatePath('/mieter');
    // Revalidate related apartment details if a tenant was unlinked from an apartment.
    // This is a general revalidation; specific apartment revalidation might be too complex here
    // without knowing which apartment was affected.
    revalidatePath('/wohnungen'); 
    // Also consider revalidating the dashboard if it summarizes tenant counts or related info.
    // revalidatePath('/'); 

    return { success: true };

  } catch (e: unknown) { // Using unknown for better type safety with instanceof
    console.error("Unexpected error in deleteTenantAction:", e);
    if (e instanceof Error) {
      return { success: false, error: { message: e.message } };
    }
    return { success: false, error: { message: "An unknown server error occurred" } };
  }
}

export async function getMieterByHausIdAction(hausId: string): Promise<{ success: boolean; data?: Mieter[] | null; error?: string | null; }> {
  if (!hausId) {
    return { success: false, error: "Haus ID is required.", data: null };
  }

  const supabase = await createClient();

  try {
    // Step 1: Fetch Wohnungen associated with the hausId
    const { data: wohnungenInHaus, error: wohnungenError } = await supabase
      .from("Wohnungen")
      .select("id")
      .eq("haus_id", hausId);

    if (wohnungenError) {
      console.error(`Error fetching Wohnungen for Haus ${hausId}:`, wohnungenError.message);
      return { success: false, error: wohnungenError.message, data: null };
    }

    if (!wohnungenInHaus || wohnungenInHaus.length === 0) {
      // No Wohnungen in this Haus, so no Mieter. This is a successful query with no results.
      return { success: true, data: [] };
    }

    const wohnungIds = wohnungenInHaus.map(w => w.id);

    // Step 2: Fetch Mieter who are in these Wohnungen
    // Including Wohnungen details as per the original fetchMieter and potential needs
    const { data: mieterData, error: mieterError } = await supabase
      .from("Mieter")
      .select("*, Wohnungen(name, groesse, miete)") 
      .in("wohnung_id", wohnungIds);

    if (mieterError) {
      console.error(`Error fetching Mieter for Haus ${hausId} (Wohnung IDs: ${wohnungIds.join(', ')}):`, mieterError.message);
      return { success: false, error: mieterError.message, data: null };
    }
    
    // If mieterData is null (though no error), it means no tenants found for those wohnung_ids.
    // This is also a successful query with no results.
    return { success: true, data: mieterData || [] };

  } catch (e: any) {
    console.error("Unexpected error in getMieterByHausIdAction:", e.message);
    return { success: false, error: e.message || "An unexpected error occurred.", data: null };
  }
}
