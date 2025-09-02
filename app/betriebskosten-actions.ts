"use server";

import { createClient } from "@/utils/supabase/server"; // Adjusted based on common project structure
import { revalidatePath } from "next/cache";
import { Nebenkosten, fetchNebenkostenDetailsById, WasserzaehlerFormData, Mieter, Wasserzaehler, Rechnung, fetchWasserzaehlerByHausAndYear } from "../lib/data-fetching"; // Adjusted path, Added Rechnung

// Import optimized types from centralized location
import { 
  OptimizedNebenkosten, 
  WasserzaehlerModalData, 
  AbrechnungModalData,
  OptimizedActionResponse,
  SafeRpcCallResult
} from "@/types/optimized-betriebskosten";

/**
 * Gets the most recent Wasserzaehler record for each mieter from a list of records
 * @param records Array of Wasserzaehler records, expected to be sorted by ablese_datum descending
 * @returns Object mapping mieter_id to their most recent Wasserzaehler record
 */
function getMostRecentByMieter(records: Wasserzaehler[]): Record<string, Wasserzaehler> {
  const mostRecent: Record<string, Wasserzaehler> = {};
  for (const record of records) {
    // Since records are sorted descending, the first one for a mieter is the most recent
    if (!mostRecent[record.mieter_id]) {
      mostRecent[record.mieter_id] = record;
    }
  }
  return mostRecent;
}

// Define an input type for Nebenkosten data
export type NebenkostenFormData = {
  startdatum: string; // ISO date string (YYYY-MM-DD)
  enddatum: string;   // ISO date string (YYYY-MM-DD)
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

/**
 * Gets the previous Wasserzaehler record for a specific mieter.
 * If currentYear is provided, it will first try to find a reading from the previous year.
 * If no previous year reading is found, it falls back to the most recent reading regardless of year.
 * 
 * @param mieterId - The ID of the mieter to get the previous reading for
 * @param currentYear - Optional. The current year as a string (e.g., '2024'). If provided, the function will first look for a reading from the previous year.
 * @returns An object containing the success status, the previous Wasserzaehler record (if found), and an optional message
 */
export async function getPreviousWasserzaehlerRecordAction(
  mieterId: string,
  currentYear?: string
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
    // First, try to get the reading from the previous year if currentYear is provided
    if (currentYear) {
      const currentYearNum = parseInt(currentYear, 10);
      if (!isNaN(currentYearNum)) {
        const previousYear = (currentYearNum - 1).toString();
        
        // Query for the last reading from the previous year
        const { data: previousYearData, error: previousYearError } = await supabase
          .from("Wasserzaehler")
          .select("*, Nebenkosten!inner(jahr)")
          .eq("mieter_id", mieterId)
          .eq("user_id", user.id)
          .eq("Nebenkosten.jahr", previousYear)
          .order("ablese_datum", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (previousYearError && previousYearError.code !== 'PGRST116') {
          console.error(`Error fetching previous year's Wasserzaehler record for mieter_id ${mieterId}:`, previousYearError);
        } else if (previousYearData) {
          // If we found a reading from the previous year, return it
          return { success: true, data: previousYearData };
        }
      }
    }

    // If no previous year reading found, fall back to the most recent reading regardless of year
    const { data, error } = await supabase
      .from("Wasserzaehler")
      .select("*")
      .eq("mieter_id", mieterId)
      .eq("user_id", user.id)
      .order("ablese_datum", { ascending: false })
      .limit(1)
      .maybeSingle();

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

/**
 * Batch fetch previous Wasserzaehler records for multiple tenants
 * This is much more efficient than individual calls and prevents Cloudflare Worker timeouts
 */
export async function getBatchPreviousWasserzaehlerRecordsAction(
  mieterIds: string[],
  currentYear?: string
): Promise<{ success: boolean; data?: Record<string, Wasserzaehler | null>; message?: string }> {
  "use server";

  if (!mieterIds || mieterIds.length === 0) {
    return { success: false, message: "Keine Mieter-IDs angegeben." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Benutzer nicht authentifiziert." };
  }

  try {
    const result: Record<string, Wasserzaehler | null> = {};

    // First, try to get readings from the previous year if currentYear is provided
    if (currentYear) {
      const currentYearNum = parseInt(currentYear, 10);
      if (!isNaN(currentYearNum)) {
        const previousYear = (currentYearNum - 1).toString();
        
        // Batch query for previous year readings
        const { data: previousYearData, error: previousYearError } = await supabase
          .from("Wasserzaehler")
          .select("*, Nebenkosten!inner(jahr)")
          .in("mieter_id", mieterIds)
          .eq("user_id", user.id)
          .eq("Nebenkosten.jahr", previousYear)
          .order("ablese_datum", { ascending: false });

        if (previousYearError) {
          console.error(`Error fetching previous year's Wasserzaehler records:`, previousYearError);
        } else if (previousYearData) {
          // Get the most recent record for each mieter and add to result
          const groupedByMieter = getMostRecentByMieter(previousYearData);
          Object.assign(result, groupedByMieter);
        }
      }
    }

    // For mieter_ids that don't have previous year data, get their most recent reading
    const mieterIdsWithoutPreviousYear = mieterIds.filter(id => !result[id]);
    
    if (mieterIdsWithoutPreviousYear.length > 0) {
      // Get the most recent records before the current year in a single query
      const currentYearStart = currentYear ? `${currentYear}-01-01` : new Date().toISOString().split('T')[0];
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('Wasserzaehler')
        .select('*')
        .in('mieter_id', mieterIdsWithoutPreviousYear)
        .eq('user_id', user.id)
        .lt('ablese_datum', currentYearStart) // Only get readings before the current year
        .order('ablese_datum', { ascending: false });

      if (fallbackError) {
        console.error('Error finding fallback Wasserzaehler records:', fallbackError);
      } else if (fallbackData && fallbackData.length > 0) {
        // Get the most recent record for each mieter and add to result
        const groupedByMieter = getMostRecentByMieter(fallbackData);
        Object.assign(result, groupedByMieter);
      }
    }

    // Ensure all mieter_ids are represented in the result (with null if no data found)
    mieterIds.forEach(mieterId => {
      if (!(mieterId in result)) {
        result[mieterId] = null;
      }
    });

    return { success: true, data: result };

  } catch (error: any) {
    console.error('Unexpected error in getBatchPreviousWasserzaehlerRecordsAction:', error);
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

export async function getWasserzaehlerByHausAndYearAction(
  hausId: string,
  year: string
): Promise<{ success: boolean; data?: { mieterList: Mieter[]; existingReadings: Wasserzaehler[] }; message?: string }> {
  try {
    if (!hausId || !year) {
      return { success: false, message: "Haus-ID und Jahr sind erforderlich." };
    }

    // Validate year format (basic check for YYYY)
    if (!/^\d{4}$/.test(year)) {
      return { success: false, message: "Ungültiges Jahr. Bitte verwenden Sie das Format YYYY." };
    }

    const { mieterList, existingReadings } = await fetchWasserzaehlerByHausAndYear(hausId, year);
    
    return { 
      success: true, 
      data: { 
        mieterList,
        existingReadings 
      } 
    };

  } catch (error: any) {
    console.error('Error in getWasserzaehlerByHausAndYearAction:', error);
    return { 
      success: false, 
      message: `Ein Fehler ist beim Abrufen der Wasserzählerdaten aufgetreten: ${error.message || 'Unbekannter Fehler'}` 
    };
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

  console.log(`[saveWasserzaehlerData] Called with nebenkosten_id: ${nebenkosten_id}, num_entries: ${entries ? entries.length : 'null or 0'}`);

  try {
    // Prepare readings data for database function
    const readingsData = entries ? entries.map(entry => ({
      mieter_id: entry.mieter_id,
      ablese_datum: entry.ablese_datum || null,
      zaehlerstand: typeof entry.zaehlerstand === 'string' ? parseFloat(entry.zaehlerstand) : entry.zaehlerstand,
      verbrauch: entry.verbrauch ? (typeof entry.verbrauch === 'string' ? parseFloat(entry.verbrauch) : entry.verbrauch) : 0
    })) : [];

    // Use optimized database function for batch operation
    const { data, error } = await supabase.rpc('save_wasserzaehler_batch', {
      nebenkosten_id: nebenkosten_id,
      user_id: user.id,
      readings: JSON.stringify(readingsData)
    });

    if (error) {
      console.error(`[saveWasserzaehlerData] Database function error:`, error);
      return { 
        success: false, 
        message: `Fehler beim Speichern der Wasserzählerdaten: ${error.message}` 
      };
    }

    // Extract result from database function
    const result = data?.[0];
    if (!result?.success) {
      return { 
        success: false, 
        message: result?.message || 'Unbekannter Fehler beim Speichern' 
      };
    }

    revalidatePath("/dashboard/betriebskosten");

    const successMessage = result.inserted_count > 0 
      ? `${result.inserted_count} Wasserzählerdaten erfolgreich gespeichert. Gesamtverbrauch: ${result.total_verbrauch} m³`
      : result.message;

    return { 
      success: true, 
      message: successMessage,
      data: readingsData 
    };

  } catch (error) {
    console.error(`[saveWasserzaehlerData] Unexpected error:`, error);
    return { 
      success: false, 
      message: 'Ein unerwarteter Fehler ist aufgetreten' 
    };
  }
}

/**
 * Optimized version of saveWasserzaehlerData with client-side validation
 * This function performs validation before submission to reduce server load
 */
export async function saveWasserzaehlerDataOptimized(
  formData: WasserzaehlerFormData
): Promise<{ success: boolean; message?: string; data?: any[]; validationErrors?: string[] }> {
  // Import validation utilities dynamically to avoid server-side issues
  const { validateWasserzaehlerFormData, formatValidationErrors, prepareWasserzaehlerDataForSubmission } = await import('@/utils/wasserzaehler-validation');
  
  // Perform client-side validation
  const validationResult = validateWasserzaehlerFormData(formData);
  
  if (!validationResult.isValid) {
    const errorMessage = formatValidationErrors(validationResult.errors);
    return {
      success: false,
      message: 'Validierungsfehler gefunden',
      validationErrors: validationResult.errors.map(e => e.message)
    };
  }

  // If validation passes, prepare optimized data and save
  const optimizedFormData: WasserzaehlerFormData = {
    nebenkosten_id: formData.nebenkosten_id,
    entries: validationResult.validEntries
  };

  // Use the existing optimized save function
  return await saveWasserzaehlerData(optimizedFormData);
}

export async function getMieterForNebenkostenAction(
  hausId: string,
  startdatum: string,
  enddatum: string
): Promise<{ success: boolean; data?: Mieter[]; message?: string }> {
  "use server"; // Ensures this runs as a server action

  if (!hausId || !startdatum || !enddatum) {
    return { success: false, message: 'Ungültige Haus-ID oder Datumsangaben.' };
  }

  // Validate date format and range
  const startDate = new Date(startdatum);
  const endDate = new Date(enddatum);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { 
      success: false, 
      message: 'Ungültiges Datumsformat. Verwenden Sie YYYY-MM-DD.' 
    };
  }
  
  if (startDate >= endDate) {
    return { 
      success: false, 
      message: 'Enddatum muss nach dem Startdatum liegen.' 
    };
  }

  const supabase = await createClient(); // Uses the server client from utils/supabase/server

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

    // Filter tenants based on date range overlap with billing period
    const filteredMieter = mieter.filter(m => {
      const tenantEinzug = m.einzug || '1900-01-01'; // Default to very early date if no move-in
      const tenantAuszug = m.auszug || '9999-12-31'; // Default to far future if still living there
      
      // Check if tenant period overlaps with billing period
      // Overlap exists if: tenant_start <= billing_end AND tenant_end >= billing_start
      return tenantEinzug <= enddatum && tenantAuszug >= startdatum;
    });

    return { success: true, data: filteredMieter as Mieter[] };

  } catch (error: any) {
    console.error('Unexpected error in getMieterForNebenkostenAction:', error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

// ============================================================================
// OPTIMIZED SERVER ACTIONS USING DATABASE FUNCTIONS
// ============================================================================

/**
 * Utility function for safe RPC calls with proper error handling
 * @param supabase - Supabase client instance
 * @param functionName - Name of the database function to call
 * @param params - Parameters to pass to the database function
 * @returns Promise with success status, data, and optional error message
 */
export async function safeRpcCall<T>(
  supabase: any,
  functionName: string,
  params: Record<string, any>
): Promise<SafeRpcCallResult<T>> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    
    if (error) {
      console.error(`RPC ${functionName} error:`, error);
      return { 
        success: false, 
        message: `Database operation failed: ${error.message}` 
      };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error(`Unexpected error in ${functionName}:`, error);
    return { 
      success: false, 
      message: 'An unexpected error occurred' 
    };
  }
}

/**
 * Optimized replacement for fetchNebenkostenList
 * Uses the get_nebenkosten_with_metrics database function to eliminate individual getHausGesamtFlaeche calls
 * This reduces database calls from O(n) to O(1) where n is the number of nebenkosten items
 * @returns Promise with success status, optimized nebenkosten data, and optional error message
 */
export async function fetchNebenkostenListOptimized(): Promise<OptimizedActionResponse<OptimizedNebenkosten[]>> {
  "use server";
  
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    const result = await safeRpcCall<OptimizedNebenkosten[]>(
      supabase,
      'get_nebenkosten_with_metrics',
      { user_id: user.id }
    );

    if (!result.success) {
      return result;
    }

    // Transform the data to match the expected Nebenkosten format
    const transformedData = (result.data || []).map(item => ({
      ...item,
      // Map database function fields to expected format for compatibility
      Haeuser: { name: item.haus_name },
      gesamtFlaeche: item.gesamt_flaeche,
      anzahlWohnungen: item.anzahl_wohnungen,
      anzahlMieter: item.anzahl_mieter
    }));

    return { success: true, data: transformedData };

  } catch (error: any) {
    console.error('Unexpected error in fetchNebenkostenListOptimized:', error);
    return { 
      success: false, 
      message: 'An unexpected error occurred while fetching optimized nebenkosten data' 
    };
  }
}

/**
 * Optimized server action to get all Wasserzähler modal data in a single call
 * Uses the get_wasserzaehler_modal_data database function to replace multiple separate actions
 * @param nebenkostenId - The ID of the Nebenkosten entry
 * @returns Promise with success status, structured modal data, and optional error message
 */
export async function getWasserzaehlerModalDataAction(
  nebenkostenId: string
): Promise<OptimizedActionResponse<WasserzaehlerModalData[]>> {
  "use server";
  
  if (!nebenkostenId) {
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const result = await safeRpcCall<WasserzaehlerModalData[]>(
      supabase,
      'get_wasserzaehler_modal_data',
      { 
        nebenkosten_id: nebenkostenId,
        user_id: user.id 
      }
    );

    return result;

  } catch (error: any) {
    console.error('Unexpected error in getWasserzaehlerModalDataAction:', error);
    return { 
      success: false, 
      message: 'Ein unerwarteter Fehler ist beim Laden der Wasserzählerdaten aufgetreten' 
    };
  }
}

/**
 * Optimized server action to get all Abrechnung modal data in a single call
 * Uses the get_abrechnung_modal_data database function to replace multiple separate actions
 * @param nebenkostenId - The ID of the Nebenkosten entry
 * @returns Promise with success status, structured modal data, and optional error message
 */
export async function getAbrechnungModalDataAction(
  nebenkostenId: string
): Promise<OptimizedActionResponse<AbrechnungModalData>> {
  "use server";
  
  if (!nebenkostenId) {
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const result = await safeRpcCall<AbrechnungModalData>(
      supabase,
      'get_abrechnung_modal_data',
      { 
        nebenkosten_id: nebenkostenId,
        user_id: user.id 
      }
    );

    return result;

  } catch (error: any) {
    console.error('Unexpected error in getAbrechnungModalDataAction:', error);
    return { 
      success: false, 
      message: 'Ein unerwarteter Fehler ist beim Laden der Abrechnungsdaten aufgetreten' 
    };
  }
}


