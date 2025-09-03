"use server";

import { createClient } from "@/utils/supabase/server"; // Adjusted based on common project structure
import { revalidatePath } from "next/cache";
import { Nebenkosten, WasserzaehlerFormData, Mieter, Wasserzaehler, Rechnung, fetchWasserzaehlerByHausAndYear } from "../lib/data-fetching"; // Adjusted path, Added Rechnung

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("Nebenkosten")
      .select(`
        *,
        Haeuser (
          name
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching Nebenkosten details:", error);
      return { success: false, message: error.message || "Failed to fetch Nebenkosten details." };
    }

    if (data) {
      return { success: true, data: data as Nebenkosten };
    } else {
      return { success: false, message: "Nebenkosten not found." };
    }
  } catch (error: any) {
    console.error("Error in getNebenkostenDetailsAction:", error);
    return { success: false, message: error.message || "Failed to fetch Nebenkosten details." };
  }
}

// getWasserzaehlerRecordsAction removed - replaced by getWasserzaehlerModalDataAction
// which uses get_wasserzaehler_modal_data database function for better performance

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

/**
 * Optimized server action to save Wasserzähler data using batch processing
 * 
 * **Performance Optimization**: Uses the `save_wasserzaehler_batch` database function to perform
 * server-side batch processing, validation, and automatic total calculation, preventing 
 * Cloudflare Worker timeouts on large datasets.
 * 
 * **Key Features**:
 * - Batch insert operations for multiple water meter readings
 * - Server-side data validation with regex patterns
 * - Automatic calculation of total water consumption
 * - Updates Nebenkosten.wasserverbrauch with calculated total
 * - Comprehensive error handling with retry logic
 * - Performance monitoring and detailed logging
 * 
 * **Database Function**: `save_wasserzaehler_batch(nebenkosten_id, user_id, readings)`
 * 
 * **Expected Performance**:
 * - Reduces save time from 8-12s to 3-5s
 * - Handles 50+ readings without timeout
 * - Eliminates individual insert operations
 * - Provides atomic transaction safety
 * 
 * @param {WasserzaehlerFormData} formData - The water meter data to save:
 *   - `nebenkosten_id`: UUID of the associated Nebenkosten entry
 *   - `entries`: Array of water meter readings with mieter_id, zaehlerstand, verbrauch, etc.
 * 
 * @returns {Promise<{success: boolean; message?: string; data?: any[]}>} Promise resolving to:
 *   - `success`: Boolean indicating operation success
 *   - `message`: Success message with total consumption or error details
 *   - `data`: Array of processed readings (on success)
 * 
 * @throws {Error} When user is not authenticated or database operation fails
 * 
 * @example
 * ```typescript
 * const formData = {
 *   nebenkosten_id: 'nebenkosten-uuid',
 *   entries: [
 *     {
 *       mieter_id: 'tenant-1-uuid',
 *       zaehlerstand: 1234.5,
 *       verbrauch: 150.0,
 *       ablese_datum: '2024-12-31'
 *     },
 *     // ... more entries
 *   ]
 * };
 * 
 * const result = await saveWasserzaehlerData(formData);
 * if (result.success) {
 *   console.log(result.message); // "5 Wasserzählerdaten erfolgreich gespeichert. Gesamtverbrauch: 750 m³"
 * }
 * ```
 * 
 * @see {@link docs/database-functions.md#save_wasserzaehler_batch} Database function documentation
 * @see {@link saveWasserzaehlerDataOptimized} Client-side validation version
 */
export async function saveWasserzaehlerData(
  formData: WasserzaehlerFormData
): Promise<{ success: boolean; message?: string; data?: any[] }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    logger.warn("Unauthenticated access attempt to saveWasserzaehlerData", {
      operation: 'saveWasserzaehlerData'
    });
    return { success: false, message: "Benutzer nicht authentifiziert" };
  }

  const { nebenkosten_id, entries } = formData;

  logger.info('Starting Wasserzähler data save operation', {
    userId: user.id,
    nebenkostenId: nebenkosten_id,
    entryCount: entries ? entries.length : 0,
    operation: 'saveWasserzaehlerData'
  });

  try {
    // Prepare readings data for database function
    const readingsData = entries ? entries.map(entry => ({
      mieter_id: entry.mieter_id,
      ablese_datum: entry.ablese_datum || null,
      zaehlerstand: typeof entry.zaehlerstand === 'string' ? parseFloat(entry.zaehlerstand) : entry.zaehlerstand,
      verbrauch: entry.verbrauch ? (typeof entry.verbrauch === 'string' ? parseFloat(entry.verbrauch) : entry.verbrauch) : 0
    })) : [];

    // Use enhanced RPC call with retry logic for critical save operations
    const result = await withRetry(
      () => safeRpcCall<any[]>(
        supabase,
        'save_wasserzaehler_batch',
        {
          nebenkosten_id: nebenkosten_id,
          user_id: user.id,
          readings: JSON.stringify(readingsData)
        }
      ),
      {
        maxRetries: 3,
        baseDelayMs: 1500,
        retryCondition: (result) => !result.success && (result.message?.includes('timeout') ?? false)
      }
    );

    if (!result.success) {
      logger.error('Failed to save Wasserzähler data', undefined, {
        userId: user.id,
        nebenkostenId: nebenkosten_id,
        entryCount: readingsData.length,
        errorMessage: result.message,
        performanceMetrics: result.performanceMetrics
      });
      
      const userMessage = generateUserFriendlyErrorMessage(
        { message: result.message }, 
        'Speichern der Wasserzählerdaten'
      );
      
      return { 
        success: false, 
        message: userMessage
      };
    }

    // Extract result from database function
    const dbResult = result.data?.[0];
    if (!dbResult?.success) {
      logger.error('Database function returned failure', undefined, {
        userId: user.id,
        nebenkostenId: nebenkosten_id,
        dbMessage: dbResult?.message
      });
      
      return { 
        success: false, 
        message: dbResult?.message || 'Unbekannter Fehler beim Speichern' 
      };
    }

    revalidatePath("/dashboard/betriebskosten");

    const successMessage = dbResult.inserted_count > 0 
      ? `${dbResult.inserted_count} Wasserzählerdaten erfolgreich gespeichert. Gesamtverbrauch: ${dbResult.total_verbrauch} m³`
      : dbResult.message;

    logger.info('Successfully saved Wasserzähler data', {
      userId: user.id,
      nebenkostenId: nebenkosten_id,
      insertedCount: dbResult.inserted_count,
      totalVerbrauch: dbResult.total_verbrauch,
      executionTime: result.performanceMetrics?.executionTime
    });

    return { 
      success: true, 
      message: successMessage,
      data: readingsData 
    };

  } catch (error: any) {
    logger.error('Unexpected error in saveWasserzaehlerData', error, {
      userId: user.id,
      nebenkostenId: nebenkosten_id,
      operation: 'saveWasserzaehlerData'
    });
    
    const userMessage = generateUserFriendlyErrorMessage(
      error, 
      'Speichern der Wasserzählerdaten'
    );
    
    return { 
      success: false, 
      message: userMessage
    };
  }
}

/**
 * Enhanced version of saveWasserzaehlerData with client-side validation
 * 
 * **Performance Enhancement**: Performs comprehensive client-side validation before 
 * submitting data to the server, reducing server load and providing immediate feedback 
 * to users for validation errors.
 * 
 * **Validation Features**:
 * - Validates required fields (mieter_id, zaehlerstand)
 * - Checks numeric format and ranges for meter readings
 * - Validates date formats and logical date ranges
 * - Ensures consumption calculations are reasonable
 * - Provides detailed validation error messages in German
 * 
 * **Workflow**:
 * 1. Performs client-side validation using wasserzaehler-validation utils
 * 2. Returns validation errors immediately if data is invalid
 * 3. If validation passes, calls the optimized saveWasserzaehlerData function
 * 4. Provides structured error reporting for UI feedback
 * 
 * @param {WasserzaehlerFormData} formData - The water meter data to validate and save
 * 
 * @returns {Promise<{success: boolean; message?: string; data?: any[]; validationErrors?: string[]}>} Promise resolving to:
 *   - `success`: Boolean indicating operation success
 *   - `message`: Success/error message or validation summary
 *   - `data`: Array of processed readings (on success)
 *   - `validationErrors`: Array of validation error messages (on validation failure)
 * 
 * @example
 * ```typescript
 * const result = await saveWasserzaehlerDataOptimized(formData);
 * if (!result.success && result.validationErrors) {
 *   // Handle validation errors in UI
 *   result.validationErrors.forEach(error => {
 *     console.error('Validation error:', error);
 *   });
 * } else if (result.success) {
 *   console.log('Data saved successfully:', result.message);
 * }
 * ```
 * 
 * @see {@link saveWasserzaehlerData} Base save function
 * @see {@link utils/wasserzaehler-validation.ts} Validation utilities
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

// getMieterForNebenkostenAction removed - replaced by getWasserzaehlerModalDataAction
// which uses get_wasserzaehler_modal_data database function for better performance

// ============================================================================
// OPTIMIZED SERVER ACTIONS USING DATABASE FUNCTIONS
// ============================================================================

// Import enhanced error handling utilities
import { 
  safeRpcCall as enhancedSafeRpcCall, 
  withRetry, 
  generateUserFriendlyErrorMessage 
} from '@/lib/error-handling';
import { logger } from '@/utils/logger';

/**
 * Enhanced utility function for safe RPC calls with comprehensive error handling
 * @deprecated Use enhancedSafeRpcCall from @/lib/error-handling instead
 */
export async function safeRpcCall<T>(
  supabase: any,
  functionName: string,
  params: any[] | Record<string, any> = []
): Promise<SafeRpcCallResult<T>> {
  // Get user ID for logging context
  let userId: string | undefined;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  } catch (error) {
    // Continue without user ID if auth fails
  }

  // Convert array params to object format if needed
  const paramsObject = Array.isArray(params) ? {} : params;

  const result = await enhancedSafeRpcCall<T>(supabase, functionName, paramsObject, {
    userId
  });

  // Ensure we return a properly typed result
  return {
    success: result.success,
    data: result.data,
    message: result.message
  };
}

/**
 * Optimized replacement for fetchNebenkostenList that eliminates performance bottlenecks
 * 
 * **Performance Optimization**: Uses the `get_nebenkosten_with_metrics` database function to eliminate 
 * individual `getHausGesamtFlaeche` calls, reducing database calls from O(n) to O(1) where n is the 
 * number of nebenkosten items.
 * 
 * **Key Improvements**:
 * - Single database query with JOINs and aggregations
 * - Pre-calculated house metrics (total area, apartment count, tenant count)
 * - Efficient tenant filtering by date range overlap
 * - Comprehensive error handling with retry logic
 * - Performance monitoring and logging
 * 
 * **Database Function**: `get_nebenkosten_with_metrics(user_id)`
 * 
 * **Expected Performance**: 
 * - Reduces page load time from 5-8s to 2-3s
 * - Eliminates Cloudflare Worker timeout issues
 * - Scales efficiently with large datasets (100+ items)
 * 
 * @returns {Promise<OptimizedActionResponse<OptimizedNebenkosten[]>>} Promise resolving to:
 *   - `success`: Boolean indicating operation success
 *   - `data`: Array of nebenkosten with pre-calculated house metrics
 *   - `message`: Error message if operation failed
 * 
 * @throws {Error} When database connection fails or user is not authenticated
 * 
 * @example
 * ```typescript
 * const result = await fetchNebenkostenListOptimized();
 * if (result.success) {
 *   console.log(`Loaded ${result.data.length} nebenkosten items`);
 *   result.data.forEach(item => {
 *     console.log(`${item.Haeuser.name}: ${item.anzahlMieter} tenants`);
 *   });
 * }
 * ```
 * 
 * @see {@link docs/database-functions.md#get_nebenkosten_with_metrics} Database function documentation
 * @see {@link .kiro/specs/betriebskosten-performance-optimization/design.md} Performance optimization design
 */
export async function fetchNebenkostenListOptimized(): Promise<OptimizedActionResponse<OptimizedNebenkosten[]>> {
  "use server";
  
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('Unauthenticated access attempt to fetchNebenkostenListOptimized');
      return { success: false, message: "Benutzer nicht authentifiziert" };
    }

    logger.info('Starting optimized nebenkosten list fetch', { 
      userId: user.id,
      operation: 'fetchNebenkostenListOptimized'
    });

    const result = await withRetry(
      () => safeRpcCall<OptimizedNebenkosten[]>(
        supabase,
        'get_nebenkosten_with_metrics',
        { user_id: user.id }
      ),
      {
        maxRetries: 2,
        baseDelayMs: 1000
      }
    );

    if (!result.success) {
      logger.error('Failed to fetch optimized nebenkosten list', undefined, {
        userId: user.id,
        errorMessage: result.message,
        performanceMetrics: result.performanceMetrics
      });
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

    logger.info('Successfully fetched optimized nebenkosten list', {
      userId: user.id,
      itemCount: transformedData.length,
      executionTime: result.performanceMetrics?.executionTime
    });

    return { success: true, data: transformedData };

  } catch (error: any) {
    logger.error('Unexpected error in fetchNebenkostenListOptimized', error, {
      operation: 'fetchNebenkostenListOptimized'
    });
    
    const userMessage = generateUserFriendlyErrorMessage(
      error, 
      'Laden der Betriebskosten-Liste'
    );
    
    return { 
      success: false, 
      message: userMessage
    };
  }
}

/**
 * Optimized server action to fetch all Wasserzähler modal data in a single database call
 * 
 * **Performance Optimization**: Replaces multiple separate server actions with a single optimized 
 * database function call, eliminating multiple round-trips and reducing modal loading time.
 * 
 * **Replaces These Actions**:
 * - `getMieterForNebenkostenAction()`
 * - `getWasserzaehlerRecordsAction()`
 * - `getBatchPreviousWasserzaehlerRecordsAction()`
 * 
 * **Key Features**:
 * - Fetches tenants who lived during the billing period
 * - Retrieves current water meter readings for the nebenkosten
 * - Gets previous year readings for comparison
 * - Handles missing data gracefully with null values
 * - Includes apartment size information for calculations
 * 
 * **Database Function**: `get_wasserzaehler_modal_data(nebenkosten_id, user_id)`
 * 
 * **Expected Performance**:
 * - Reduces modal open time from 3-5s to 1-2s
 * - Eliminates 3+ separate database queries
 * - Prevents Cloudflare Worker timeouts on large datasets
 * 
 * @param {string} nebenkostenId - The UUID of the Nebenkosten entry to fetch data for
 * 
 * @returns {Promise<OptimizedActionResponse<WasserzaehlerModalData[]>>} Promise resolving to:
 *   - `success`: Boolean indicating operation success
 *   - `data`: Array of tenant data with current and previous readings
 *   - `message`: Error message if operation failed
 * 
 * @throws {Error} When nebenkosten ID is invalid or user lacks access permissions
 * 
 * @example
 * ```typescript
 * const result = await getWasserzaehlerModalDataAction('nebenkosten-uuid');
 * if (result.success && result.data) {
 *   result.data.forEach(tenant => {
 *     console.log(`${tenant.mieter_name}: Current ${tenant.current_reading?.zaehlerstand || 'N/A'}`);
 *     console.log(`Previous: ${tenant.previous_reading?.zaehlerstand || 'N/A'}`);
 *   });
 * }
 * ```
 * 
 * @see {@link docs/database-functions.md#get_wasserzaehler_modal_data} Database function documentation
 * @see {@link components/wasserzaehler-modal.tsx} Modal component that consumes this data
 */
export async function getWasserzaehlerModalDataAction(
  nebenkostenId: string
): Promise<OptimizedActionResponse<WasserzaehlerModalData[]>> {
  "use server";
  
  if (!nebenkostenId || nebenkostenId.trim() === '') {
    logger.warn('Invalid nebenkosten ID provided to getWasserzaehlerModalDataAction', {
      nebenkostenId,
      operation: 'getWasserzaehlerModalDataAction'
    });
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('Unauthenticated access attempt to getWasserzaehlerModalDataAction', {
        nebenkostenId,
        operation: 'getWasserzaehlerModalDataAction'
      });
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    logger.info('Starting Wasserzähler modal data fetch', {
      userId: user.id,
      nebenkostenId,
      operation: 'getWasserzaehlerModalDataAction'
    });

    // Try to use the optimized database function first
    const result = await withRetry(
      () => safeRpcCall<WasserzaehlerModalData[]>(
        supabase,
        'get_wasserzaehler_modal_data',
        { 
          nebenkosten_id: nebenkostenId,
          user_id: user.id 
        }
      ),
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        retryCondition: (result) => !result.success && ((result.message?.includes('does not exist') ?? false) || (result.message?.includes('FROM-clause entry') ?? false))
      }
    );

    if (!result.success) {
      // If the database function doesn't exist, fall back to individual queries
      const originalError = result.performanceMetrics?.errorMessage || result.message || '';
      if (originalError.includes('does not exist') || 
          originalError.includes('FROM-clause entry') || 
          originalError.includes('missing FROM-clause entry')) {
        logger.warn('Database function not available, using fallback queries', {
          userId: user.id,
          nebenkostenId,
          functionName: 'get_wasserzaehler_modal_data',
          originalError
        });

        // Fallback implementation using regular queries
        const { data: nebenkostenData, error: nebenkostenError } = await supabase
          .from("Nebenkosten")
          .select("haeuser_id, startdatum, enddatum")
          .eq("id", nebenkostenId)
          .eq("user_id", user.id)
          .single();

        if (nebenkostenError || !nebenkostenData) {
          logger.error('Failed to fetch Nebenkosten details', nebenkostenError || undefined, {
            userId: user.id,
            nebenkostenId
          });
          return { success: false, message: "Nebenkosten-Eintrag nicht gefunden." };
        }

        // Get tenants who lived in the house during the billing period
        const { data: tenants, error: tenantsError } = await supabase
          .from("Mieter")
          .select(`
            id,
            name,
            einzug,
            auszug,
            Wohnungen!inner (
              name,
              groesse,
              haus_id
            )
          `)
          .eq("Wohnungen.haus_id", nebenkostenData.haeuser_id)
          .eq("user_id", user.id)
          .lte("einzug", nebenkostenData.enddatum)
          .or(`auszug.is.null,auszug.gte.${nebenkostenData.startdatum}`);

        if (tenantsError) {
          logger.error('Failed to fetch tenants', tenantsError || undefined, {
            userId: user.id,
            nebenkostenId
          });
          return { success: false, message: "Fehler beim Laden der Mieterdaten." };
        }

        // Get current readings for this nebenkosten
        const { data: currentReadings, error: currentError } = await supabase
          .from("Wasserzaehler")
          .select("*")
          .eq("nebenkosten_id", nebenkostenId)
          .eq("user_id", user.id);

        if (currentError) {
          logger.error('Failed to fetch current readings', currentError || undefined, {
            userId: user.id,
            nebenkostenId
          });
        }

        // Get previous readings for each tenant
        const tenantIds = tenants?.map(t => t.id) || [];
        const { data: previousReadings, error: previousError } = await supabase
          .from("Wasserzaehler")
          .select("*")
          .in("mieter_id", tenantIds)
          .eq("user_id", user.id)
          .lt("ablese_datum", nebenkostenData.startdatum)
          .order("ablese_datum", { ascending: false });

        if (previousError) {
          logger.error('Failed to fetch previous readings', previousError || undefined, {
            userId: user.id,
            nebenkostenId
          });
        }

        // Build the response data
        const modalData: WasserzaehlerModalData[] = (tenants || []).map(tenant => {
          const currentReading = currentReadings?.find(r => r.mieter_id === tenant.id);
          const previousReading = previousReadings?.find(r => r.mieter_id === tenant.id);
          
          // Type assertion for Wohnungen since Supabase join returns it as an object, not array
          const wohnung = Array.isArray(tenant.Wohnungen) ? tenant.Wohnungen[0] : tenant.Wohnungen;
          
          return {
            mieter_id: tenant.id,
            mieter_name: tenant.name,
            wohnung_name: wohnung?.name || 'Unbekannt',
            wohnung_groesse: wohnung?.groesse || 0,
            current_reading: currentReading ? {
              ablese_datum: currentReading.ablese_datum,
              zaehlerstand: currentReading.zaehlerstand,
              verbrauch: currentReading.verbrauch
            } : null,
            previous_reading: previousReading ? {
              ablese_datum: previousReading.ablese_datum,
              zaehlerstand: previousReading.zaehlerstand,
              verbrauch: previousReading.verbrauch
            } : null
          };
        });

        logger.info('Successfully fetched Wasserzähler modal data using fallback', {
          userId: user.id,
          nebenkostenId,
          recordCount: modalData.length
        });

        return { success: true, data: modalData };
      }

      logger.error('Failed to fetch Wasserzähler modal data', undefined, {
        userId: user.id,
        nebenkostenId,
        errorMessage: result.message,
        performanceMetrics: result.performanceMetrics
      });
      return result;
    }

    logger.info('Successfully fetched Wasserzähler modal data using optimized function', {
      userId: user.id,
      nebenkostenId,
      recordCount: result.data?.length || 0,
      executionTime: result.performanceMetrics?.executionTime
    });

    return result;

  } catch (error: any) {
    logger.error('Unexpected error in getWasserzaehlerModalDataAction', error, {
      nebenkostenId,
      operation: 'getWasserzaehlerModalDataAction'
    });
    
    const userMessage = generateUserFriendlyErrorMessage(
      error, 
      'Laden der Wasserzählerdaten'
    );
    
    return { 
      success: false, 
      message: userMessage
    };
  }
}

/**
 * Optimized server action to fetch all Abrechnung modal data in a single database call
 * 
 * **Performance Optimization**: Consolidates multiple data fetching operations into a single 
 * optimized database function call, significantly reducing modal loading time and preventing 
 * Cloudflare Worker timeouts.
 * 
 * **Data Aggregation**: Fetches and structures all required data for the Abrechnung modal:
 * - Complete nebenkosten information with house details
 * - All relevant tenants with apartment information
 * - Existing rechnungen (bills) for this nebenkosten period
 * - Water meter readings for consumption calculations
 * - Pre-calculated house metrics (area, apartment count, tenant count)
 * 
 * **Database Function**: `get_abrechnung_modal_data(nebenkosten_id, user_id)`
 * 
 * **Expected Performance**:
 * - Reduces modal open time from 4-6s to 1-2s
 * - Eliminates 5+ separate database queries
 * - Handles large datasets efficiently (50+ tenants)
 * - Prevents timeout issues with complex calculations
 * 
 * @param {string} nebenkostenId - The UUID of the Nebenkosten entry to fetch data for
 * 
 * @returns {Promise<OptimizedActionResponse<AbrechnungModalData>>} Promise resolving to:
 *   - `success`: Boolean indicating operation success
 *   - `data`: Structured object containing all modal data:
 *     - `nebenkosten_data`: Complete nebenkosten info with house details
 *     - `tenants`: Array of relevant tenants with apartment info
 *     - `rechnungen`: Array of existing bills for this period
 *     - `wasserzaehler_readings`: Array of water meter readings
 *   - `message`: Error message if operation failed
 * 
 * @throws {Error} When nebenkosten ID is invalid or user lacks access permissions
 * 
 * @example
 * ```typescript
 * const result = await getAbrechnungModalDataAction('nebenkosten-uuid');
 * if (result.success && result.data) {
 *   const { nebenkosten_data, tenants, rechnungen, wasserzaehler_readings } = result.data;
 *   console.log(`House: ${nebenkosten_data.Haeuser.name}`);
 *   console.log(`Tenants: ${tenants.length}`);
 *   console.log(`Existing bills: ${rechnungen.length}`);
 *   console.log(`Water readings: ${wasserzaehler_readings.length}`);
 * }
 * ```
 * 
 * @see {@link docs/database-functions.md#get_abrechnung_modal_data} Database function documentation
 * @see {@link components/abrechnung-modal.tsx} Modal component that consumes this data
 */
export async function getAbrechnungModalDataAction(
  nebenkostenId: string
): Promise<OptimizedActionResponse<AbrechnungModalData>> {
  "use server";
  
  if (!nebenkostenId || nebenkostenId.trim() === '') {
    logger.warn('Invalid nebenkosten ID provided to getAbrechnungModalDataAction', {
      nebenkostenId,
      operation: 'getAbrechnungModalDataAction'
    });
    return { success: false, message: "Ungültige Nebenkosten-ID angegeben." };
  }

  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('Unauthenticated access attempt to getAbrechnungModalDataAction', {
        nebenkostenId,
        operation: 'getAbrechnungModalDataAction'
      });
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    logger.info('Starting Abrechnung modal data fetch', {
      userId: user.id,
      nebenkostenId,
      operation: 'getAbrechnungModalDataAction'
    });

    // Try to use the optimized database function first
    const result = await withRetry(
      () => safeRpcCall<AbrechnungModalData>(
        supabase,
        'get_abrechnung_modal_data',
        { 
          nebenkosten_id: nebenkostenId,
          user_id: user.id 
        }
      ),
      {
        maxRetries: 2,
        baseDelayMs: 1000,
        retryCondition: (result) => !result.success && ((result.message?.includes('does not exist') ?? false) || (result.message?.includes('FROM-clause entry') ?? false))
      }
    );

    if (!result.success) {
      // If the database function doesn't exist, fall back to individual queries
      const originalError = result.performanceMetrics?.errorMessage || result.message || '';
      if (originalError.includes('does not exist') || 
          originalError.includes('FROM-clause entry') || 
          originalError.includes('missing FROM-clause entry')) {
        logger.warn('Database function not available, using fallback queries', {
          userId: user.id,
          nebenkostenId,
          functionName: 'get_abrechnung_modal_data',
          originalError
        });

        // Fallback implementation using regular queries
        const { data: nebenkostenData, error: nebenkostenError } = await supabase
          .from("Nebenkosten")
          .select(`
            *,
            Haeuser (
              name,
              groesse
            )
          `)
          .eq("id", nebenkostenId)
          .eq("user_id", user.id)
          .single();

        if (nebenkostenError || !nebenkostenData) {
          logger.error('Failed to fetch Nebenkosten details', nebenkostenError || undefined, {
            userId: user.id,
            nebenkostenId
          });
          return { success: false, message: "Nebenkosten-Eintrag nicht gefunden." };
        }

        // Get tenants who lived in the house during the billing period
        const { data: tenants, error: tenantsError } = await supabase
          .from("Mieter")
          .select(`
            *,
            Wohnungen!inner (
              name,
              groesse,
              miete,
              haus_id
            )
          `)
          .eq("Wohnungen.haus_id", nebenkostenData.haeuser_id)
          .eq("user_id", user.id)
          .lte("einzug", nebenkostenData.enddatum)
          .or(`auszug.is.null,auszug.gte.${nebenkostenData.startdatum}`);

        if (tenantsError) {
          logger.error('Failed to fetch tenants', tenantsError || undefined, {
            userId: user.id,
            nebenkostenId
          });
          return { success: false, message: "Fehler beim Laden der Mieterdaten." };
        }

        // Get existing rechnungen for this nebenkosten
        const { data: rechnungen, error: rechnungenError } = await supabase
          .from("Rechnungen")
          .select("*")
          .eq("nebenkosten_id", nebenkostenId)
          .eq("user_id", user.id);

        if (rechnungenError) {
          logger.error('Failed to fetch rechnungen', rechnungenError || undefined, {
            userId: user.id,
            nebenkostenId
          });
        }

        // Get wasserzaehler readings for this nebenkosten
        const { data: wasserzaehlerReadings, error: wasserzaehlerError } = await supabase
          .from("Wasserzaehler")
          .select("*")
          .eq("nebenkosten_id", nebenkostenId)
          .eq("user_id", user.id);

        if (wasserzaehlerError) {
          logger.error('Failed to fetch wasserzaehler readings', wasserzaehlerError || undefined, {
            userId: user.id,
            nebenkostenId
          });
        }

        // Calculate house metrics
        const totalArea = nebenkostenData.Haeuser?.groesse || 
          (tenants || []).reduce((sum, t) => sum + (t.Wohnungen?.groesse || 0), 0);
        
        const apartmentCount = new Set((tenants || []).map(t => t.wohnung_id)).size;

        // Build the response data
        const modalData: AbrechnungModalData = {
          nebenkosten_data: {
            ...nebenkostenData,
            gesamtFlaeche: totalArea,
            anzahlWohnungen: apartmentCount,
            anzahlMieter: (tenants || []).length
          } as Nebenkosten,
          tenants: tenants || [],
          rechnungen: rechnungen || [],
          wasserzaehler_readings: wasserzaehlerReadings || []
        };

        logger.info('Successfully fetched Abrechnung modal data using fallback', {
          userId: user.id,
          nebenkostenId,
          tenantCount: modalData.tenants.length,
          rechnungenCount: modalData.rechnungen.length
        });

        return { success: true, data: modalData };
      }

      logger.error('Failed to fetch Abrechnung modal data', undefined, {
        userId: user.id,
        nebenkostenId,
        errorMessage: result.message,
        performanceMetrics: result.performanceMetrics
      });
      return result;
    }

    logger.info('Successfully fetched Abrechnung modal data using optimized function', {
      userId: user.id,
      nebenkostenId,
      tenantCount: result.data?.tenants?.length || 0,
      rechnungenCount: result.data?.rechnungen?.length || 0,
      executionTime: result.performanceMetrics?.executionTime
    });

    return result;

  } catch (error: any) {
    logger.error('Unexpected error in getAbrechnungModalDataAction', error, {
      nebenkostenId,
      operation: 'getAbrechnungModalDataAction'
    });
    
    const userMessage = generateUserFriendlyErrorMessage(
      error, 
      'Laden der Abrechnungsdaten'
    );
    
    return { 
      success: false, 
      message: userMessage
    };
  }
}


