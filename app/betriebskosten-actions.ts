"use server";

import { createClient } from "@/utils/supabase/server"; // Adjusted based on common project structure
import { revalidatePath } from "next/cache";
import { Nebenkosten, fetchNebenkostenDetailsById, WasserzaehlerFormData, Mieter, Wasserzaehler, Rechnung } from "../lib/data-fetching"; // Adjusted path, Added Rechnung

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

export async function getWasserzaehlerRecordsAction(
  nebenkostenId: string
): Promise<{ success: boolean; data?: Wasserzaehler[]; message?: string }> {
  "use server";

  if (!nebenkostenId) {
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    const { data, error } = await supabase
      .from("Wasserzaehler")
      .select("*")
      .eq("nebenkosten_id", nebenkostenId) // Ensure correct column name here
      .eq("user_id", user.id);

    if (error) {
      console.error(`Error fetching Wasserzaehler records for nebenkosten_id ${nebenkostenId}:`, error);
      return { success: false, message: `Fehler beim Abrufen der Wasserzählerdaten: ${error.message}` };
    }

    return { success: true, data: data as Wasserzaehler[] };

  } catch (error: any) {
    console.error('Unexpected error in getWasserzaehlerRecordsAction:', error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

export async function getPreviousWasserzaehlerRecordAction(
  mieterId: string
): Promise<{ success: boolean; data?: Wasserzaehler | null; message?: string }> {
  "use server";

  if (!mieterId) {
    return { success: false, message: "Ungültige Mieter-ID angegeben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    const { data, error } = await supabase
      .from("Wasserzaehler")
      .select("*")
      .eq("mieter_id", mieterId)
      .order("ablese_datum", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // PostgREST error code for "Not a single row was found"
        return { success: true, data: null }; // No previous record is not an error
      }
      console.error(`Error fetching previous Wasserzaehler record for mieter_id ${mieterId}:`, error);
      return { success: false, message: `Fehler beim Abrufen des vorherigen Zählerstands: ${error.message}` };
    }

    return { success: true, data };

  } catch (error: any) {
    console.error('Unexpected error in getPreviousWasserzaehlerRecordAction:', error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

export async function getRechnungenForNebenkostenAction(nebenkostenId: string): Promise<{
  success: boolean;
  data?: Rechnung[];
  message?: string;
}> {
  "use server";

  if (!nebenkostenId) {
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    const { data, error } = await supabase
      .from("Rechnungen")
      .select("*") // Selects all columns, matching the Rechnung interface
      .eq("nebenkosten_id", nebenkostenId)
      .eq("user_id", user.id); // Ensuring user can only fetch their own Rechnungen

    if (error) {
      console.error(`Error fetching Rechnungen for nebenkosten_id ${nebenkostenId}:`, error);
      return { success: false, message: `Fehler beim Abrufen der Rechnungen: ${error.message}` };
    }

    return { success: true, data: data as Rechnung[] };

  } catch (error: any) {
    console.error('Unexpected error in getRechnungenForNebenkostenAction:', error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
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

  // --- Log Incoming Data ---
  console.log(`[saveWasserzaehlerData] Called with nebenkosten_id: ${nebenkosten_id}, num_entries: ${entries ? entries.length : 'null or 0'}`);

  // Original condition for logging, can be removed if the one above is sufficient
  // if (!nebenkosten_id || !entries || entries.length === 0) {
  //   console.log(`[saveWasserzaehlerData] No entries provided for nebenkosten_id: ${nebenkosten_id}. Considering deletion of existing entries or setting sum to 0.`);
  // }

  // Strategy: Delete existing entries for this nebenkosten_id, then insert new ones.
  const { error: deleteError } = await supabase
    .from("Wasserzaehler")
    .delete()
    .eq("nebenkosten_id", nebenkosten_id) // Corrected column name
    .eq("user_id", user.id); // Ensure user can only delete their own records

  // --- Log Deletion Result ---
  if (deleteError) {
    console.error(`[saveWasserzaehlerData] Error deleting Wasserzaehler entries for ${nebenkosten_id}:`, deleteError);
    return { success: false, message: `Fehler beim Löschen vorhandener Einträge: ${deleteError.message}` };
  } else {
    console.log(`[saveWasserzaehlerData] Successfully deleted existing Wasserzaehler entries for ${nebenkosten_id}.`);
  }

  // If there are no new entries to save, we are done after deletion.
  // However, we still need to update Nebenkosten.wasserverbrauch to 0.
  if (!entries || entries.length === 0) {
    // --- Log Update to 0 (if entries are empty) ---
    console.log(`[saveWasserzaehlerData] Attempting to set wasserverbrauch to 0 for Nebenkosten ID: ${nebenkosten_id}`);
    const { data: updateData, error: updateNkError } = await supabase
      .from("Nebenkosten")
      .update({ wasserverbrauch: 0 })
      .eq("id", nebenkosten_id)
      .eq("user_id", user.id)
      .select(); // Add .select() to see what was updated

    if (updateNkError) {
      console.error(`[saveWasserzaehlerData] Error updating Nebenkosten.wasserverbrauch to 0 for ${nebenkosten_id}:`, updateNkError);
      // Non-fatal, but log it. The main operation (deleting entries) was successful.
    } else {
      console.log(`[saveWasserzaehlerData] Successfully updated Nebenkosten.wasserverbrauch to 0 for ${nebenkosten_id}. Update data:`, updateData);
    }

    revalidatePath("/dashboard/betriebskosten");
    return { success: true, message: "Alle vorhandenen Wasserzählerdaten für diese Nebenkostenabrechnung wurden entfernt und der Gesamtverbrauch auf 0 gesetzt.", data: [] };
  }

  const recordsToInsert = entries.map(entry => ({
    user_id: user.id,
    mieter_id: entry.mieter_id,
    ablese_datum: entry.ablese_datum, // Assumes this is already a string 'YYYY-MM-DD' or null
    zaehlerstand: typeof entry.zaehlerstand === 'string' ? parseFloat(entry.zaehlerstand) : entry.zaehlerstand,
    verbrauch: typeof entry.verbrauch === 'string' ? parseFloat(entry.verbrauch) : entry.verbrauch,
    nebenkosten_id: nebenkosten_id, // Corrected key for the database column
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from("Wasserzaehler")
    .insert(recordsToInsert)
    .select();

  // --- Log Insertion Result ---
  if (insertError) {
    console.error(`[saveWasserzaehlerData] Error inserting new Wasserzaehler data for ${nebenkosten_id}:`, insertError);
    return { success: false, message: `Fehler beim Speichern der Wasserzählerdaten: ${insertError.message}` };
  } else {
    console.log(`[saveWasserzaehlerData] Successfully inserted ${insertedData ? insertedData.length : 0} new Wasserzaehler entries for ${nebenkosten_id}.`);
  }

  // After successful insert, calculate sum and update Nebenkosten
  // 1. Query all Wasserzaehler records for this nebenkosten_id and user_id
  const { data: zaehlerRecords, error: fetchError } = await supabase
    .from("Wasserzaehler")
    .select("verbrauch")
    .eq("nebenkosten_id", nebenkosten_id)
    .eq("user_id", user.id);

  // --- Log Sum Calculation ---
  if (fetchError) {
    console.error(`[saveWasserzaehlerData] Error fetching Wasserzaehler records for sum (nebenkosten_id: ${nebenkosten_id}):`, fetchError);
    // This is not ideal, as data was inserted but sum couldn't be updated.
    // Return success as main operation (insert) was successful, but include a warning or partial success message.
    return {
      success: true,
      data: insertedData,
      message: `Wasserzählerdaten gespeichert, aber Gesamtverbrauch konnte nicht aktualisiert werden: ${fetchError.message}`
    };
  } else {
    console.log(`[saveWasserzaehlerData] Fetched ${zaehlerRecords ? zaehlerRecords.length : 0} records for sum. Calculated totalVerbrauch: ${zaehlerRecords.reduce((sum, record) => sum + (record.verbrauch || 0), 0)} for Nebenkosten ID: ${nebenkosten_id}`);
  }

  // 2. Calculate the sum of verbrauch
  const totalVerbrauch = zaehlerRecords.reduce((sum, record) => sum + (record.verbrauch || 0), 0);

  // 3. Update the Nebenkosten table
  // --- Log Final Nebenkosten Update ---
  console.log(`[saveWasserzaehlerData] Attempting to update Nebenkosten ID: ${nebenkosten_id} with totalVerbrauch: ${totalVerbrauch}`);
  const { data: finalUpdateData, error: updateNkError } = await supabase
    .from("Nebenkosten")
    .update({ wasserverbrauch: totalVerbrauch })
    .eq("id", nebenkosten_id)
    .eq("user_id", user.id) // Ensure user context for security
    .select(); // Add .select()

  if (updateNkError) {
    console.error(`[saveWasserzaehlerData] Error updating Nebenkosten.wasserverbrauch with totalVerbrauch for ${nebenkosten_id}:`, updateNkError);
    return {
      success: true,
      data: insertedData,
      message: `Wasserzählerdaten gespeichert und Gesamtverbrauch berechnet (${totalVerbrauch}), aber Update der Nebenkosten ist fehlgeschlagen: ${updateNkError.message}`
    };
  } else {
    console.log(`[saveWasserzaehlerData] Successfully updated Nebenkosten.wasserverbrauch with totalVerbrauch (${totalVerbrauch}) for ${nebenkosten_id}. Update data:`, finalUpdateData);
  }

  revalidatePath("/dashboard/betriebskosten");

  return { success: true, data: insertedData, message: "Wasserzählerdaten erfolgreich gespeichert und Gesamtverbrauch aktualisiert." };
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
      .select('*, Wohnungen(name, groesse)') // Fetch Mieter details including apartment size
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
