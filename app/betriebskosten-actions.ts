"use server";

import { createClient } from "@/utils/supabase/server"; // Adjusted based on common project structure
import { revalidatePath } from "next/cache";
import { Nebenkosten, fetchNebenkostenDetailsById, WasserzaehlerFormData, Mieter } from "../lib/data-fetching"; // Adjusted path

// Define an input type for Nebenkosten data
export type NebenkostenFormData = {
  jahr: string;
  nebenkostenart: string[];
  betrag: number[];
  berechnungsart: string[];
  wasserkosten?: number | null;
  haeuser_id: string;
};

export interface RechnungData {
  nebenkosten_id: string;
  mieter_id: string;
  betrag: number;
  name: string;
  // user_id will be added by the action itself
}

// Implement createNebenkosten function
export async function createNebenkosten(formData: NebenkostenFormData) {
  const supabase = await createClient();

  // Ensure array fields are correctly formatted if Supabase expects them as such
  // Supabase client typically handles JS arrays correctly for postgres array types (text[], numeric[])
  // user_id will now be fetched from the session within this server action
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated for createNebenkosten");
    return { success: false, message: "User not authenticated", data: null };
  }

  const preparedData = {
    ...formData,
    user_id: user.id, 
  };

  const { data, error } = await supabase
    .from("Nebenkosten")
    .insert([preparedData])
    .select()
    .single(); // Assuming we want the single created record back

  if (error) {
    console.error("Error creating Nebenkosten:", error);
    return { success: false, message: error.message, data: null };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true, data };
}

// Implement updateNebenkosten function
export async function updateNebenkosten(id: string, formData: Partial<NebenkostenFormData>) {
  const supabase = await createClient();

  // For updates, we might not change user_id, but if we were to allow it or set it based on who's updating:
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) {
  //   console.error("User not authenticated for updateNebenkosten");
  //   return { success: false, message: "User not authenticated", data: null };
  // }
  // // Add user_id to formData if it's part of the update logic, e.g., formData.user_id = user.id;
  // // However, typically, one wouldn't change the user_id of an existing record.
  // // The provided formData will not have user_id, so this is more of a note.

  const { data, error } = await supabase
    .from("Nebenkosten")
    .update(formData) // formData here is Partial<NebenkostenFormData>, so no user_id from client
    .eq("id", id)
    .select()
    .single(); // Assuming we want the single updated record back

  if (error) {
    console.error("Error updating Nebenkosten:", error);
    return { success: false, message: error.message, data: null };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true, data };
}

// Implement deleteNebenkosten function
export async function deleteNebenkosten(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("Nebenkosten")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting Nebenkosten:", error);
    return { success: false, message: error.message };
  }

  revalidatePath("/dashboard/betriebskosten");
  return { success: true };
}

export async function createRechnungenBatch(rechnungen: RechnungData[]) {
  console.log('[Server Action] createRechnungenBatch received:', JSON.stringify(rechnungen, null, 2));
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated for createRechnungenBatch");
    return { success: false, message: "User not authenticated", data: null };
  }

  const dataWithUserId = rechnungen.map(rechnung => ({
    ...rechnung,
    user_id: user.id,
  }));

  console.log('[Server Action] Data to insert into Rechnungen table:', JSON.stringify(dataWithUserId, null, 2));

  const { data, error } = await supabase
    .from("Rechnungen")
    .insert(dataWithUserId)
    .select(); // .select() returns the inserted rows
  
  console.log('[Server Action] Supabase insert response - data:', JSON.stringify(data, null, 2));
  console.log('[Server Action] Supabase insert response - error:', JSON.stringify(error, null, 2));

  if (error) {
    console.error("Error creating Rechnungen batch:", error); // This log is already good
    return { success: false, message: error.message, data: null };
  }

  // Consider revalidating paths where Rechnungen might be displayed directly
  // e.g., revalidatePath("/dashboard/some-path-displaying-rechnungen");
  // For now, revalidating the main betriebskosten path as a general measure,
  // though direct display of individual Rechnungen might be on a different page.
  revalidatePath("/dashboard/betriebskosten"); 
  // Or more specific if a detailed view exists: revalidatePath(`/dashboard/betriebskosten/${rechnungen[0]?.nebenkosten_id}`);


  return { success: true, data };
}

export async function deleteRechnungenByNebenkostenId(nebenkostenId: string): Promise<{ success: boolean; message?: string }> {
  console.log('[Server Action] deleteRechnungenByNebenkostenId called for nebenkostenId:', nebenkostenId);
  const supabase = await createClient();

  // Authentication check (basic - RLS should handle actual data access control)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated for deleteRechnungenByNebenkostenId");
    return { success: false, message: "User not authenticated" };
  }

  const { error } = await supabase
    .from("Rechnungen")
    .delete()
    .eq("nebenkosten_id", nebenkostenId);

  if (error) {
    console.error(`Error deleting Rechnungen for nebenkosten_id ${nebenkostenId}:`, error);
    return { success: false, message: error.message };
  }

  console.log(`[Server Action] Successfully deleted Rechnungen for nebenkosten_id ${nebenkostenId}`);
  // No revalidatePath here as this is a subordinate action.
  // Revalidation should happen after the primary operation (e.g., updateNebenkosten) is complete.
  return { success: true };
}

export async function getNebenkostenDetailsAction(id: string): Promise<{
  success: boolean;
  data?: Nebenkosten | null;
  message?: string;
}> {
  "use server";
  try {
    const nebenkostenDetails = await fetchNebenkostenDetailsById(id);
    if (nebenkostenDetails) {
      return { success: true, data: nebenkostenDetails };
    } else {
      return { success: false, message: "Nebenkosten not found." };
    }
  } catch (error: any) {
    console.error("Error in getNebenkostenDetailsAction:", error);
    return { success: false, message: error.message || "Failed to fetch Nebenkosten details." };
  }
}

export async function saveWasserzaehlerData(
  formData: WasserzaehlerFormData
): Promise<{ success: boolean; message?: string; data?: any[] }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated for saveWasserzaehlerData");
    return { success: false, message: "User not authenticated" };
  }

  const { nebenkosten_id, entries } = formData;

  if (!nebenkosten_id || !entries || entries.length === 0) {
    // If entries are empty, it might mean clearing existing data.
    // Or it could be an invalid request. For now, let's assume it means clearing.
    console.log(`No entries provided for nebenkosten_id: ${nebenkosten_id}. Deleting existing entries.`);
  }

  // Strategy: Delete existing entries for this nebenkosten_id, then insert new ones.
  const { error: deleteError } = await supabase
    .from("Wasserzaehler")
    .delete()
    .eq("nebekosten_id", nebenkosten_id) // Corrected column name
    .eq("user_id", user.id); // Ensure user can only delete their own records

  if (deleteError) {
    console.error(`Error deleting existing Wasserzaehler entries for nebenkosten_id ${nebenkosten_id}:`, deleteError);
    return { success: false, message: `Fehler beim Löschen vorhandener Einträge: ${deleteError.message}` };
  }

  // If there are no new entries to save, we are done after deletion.
  if (!entries || entries.length === 0) {
    revalidatePath("/dashboard/betriebskosten"); // Or a more specific path if needed
    return { success: true, message: "Alle vorhandenen Wasserzählerdaten für diese Nebenkostenabrechnung wurden entfernt.", data: [] };
  }

  const recordsToInsert = entries.map(entry => ({
    user_id: user.id,
    mieter_id: entry.mieter_id,
    ablese_datum: entry.ablese_datum, // Assumes this is already a string 'YYYY-MM-DD' or null
    zaehlerstand: typeof entry.zaehlerstand === 'string' ? parseFloat(entry.zaehlerstand) : entry.zaehlerstand,
    verbrauch: typeof entry.verbrauch === 'string' ? parseFloat(entry.verbrauch) : entry.verbrauch,
    nebekosten_id: nebenkosten_id, // Corrected key for the database column
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from("Wasserzaehler")
    .insert(recordsToInsert)
    .select();

  if (insertError) {
    console.error("Error inserting Wasserzaehler data:", insertError);
    return { success: false, message: `Fehler beim Speichern der Wasserzählerdaten: ${insertError.message}` };
  }

  revalidatePath("/dashboard/betriebskosten"); // Or a more specific path
  // It might also be useful to revalidate a path related to the specific Nebenkosten ID if such a page exists.
  // e.g., revalidatePath(`/dashboard/betriebskosten/${nebenkosten_id}`);

  return { success: true, data: insertedData };
}

export async function getMieterForNebenkostenAction(
  hausId: string,
  jahr: string
): Promise<{ success: boolean; data?: Mieter[]; message?: string }> {
  "use server"; // Ensures this runs as a server action

  if (!hausId || !jahr) {
    return { success: false, message: 'Ungültige Haus-ID oder Jahr angegeben.' };
  }

  const supabase = await createClient(); // Uses the server client from utils/supabase/server
  const yearNum = parseInt(jahr);
  const yearStartStr = `${yearNum}-01-01`;
  const yearEndStr = `${yearNum}-12-31`;

  try {
    const { data: wohnungen, error: wohnungenError } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('haus_id', hausId);

    if (wohnungenError) {
      console.error(`Error fetching Wohnungen for hausId ${hausId} in action:`, wohnungenError);
      return { success: false, message: `Fehler beim Abrufen der Wohnungen: ${wohnungenError.message}` };
    }

    if (!wohnungen || wohnungen.length === 0) {
      // Not necessarily an error, could be a house with no apartments yet
      return { success: true, data: [] };
    }

    const wohnungIds = wohnungen.map(w => w.id);

    const { data: mieter, error: mieterError } = await supabase
      .from('Mieter')
      .select('*, Wohnungen(name)') // Fetch Mieter details
      .in('wohnung_id', wohnungIds);

    if (mieterError) {
      console.error(`Error fetching Mieter for Wohnungen in hausId ${hausId} in action:`, mieterError);
      return { success: false, message: `Fehler beim Abrufen der Mieter: ${mieterError.message}` };
    }

    if (!mieter || mieter.length === 0) {
      return { success: true, data: [] };
    }

    const filteredMieter = mieter.filter(m => {
      const einzug = m.einzug || '';
      const auszug = m.auszug || '9999-12-31';
      const tenantEinzugRelevant = einzug <= yearEndStr;
      const tenantAuszugRelevant = auszug >= yearStartStr;
      return tenantEinzugRelevant && tenantAuszugRelevant;
    });

    return { success: true, data: filteredMieter as Mieter[] };

  } catch (error: any) {
    console.error('Unexpected error in getMieterForNebenkostenAction:', error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}
