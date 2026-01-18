"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { WasserZaehler as Zaehler, WasserAblesung as Ablesung, Wohnung, Mieter } from "@/lib/data-fetching";
import { logAction } from '@/lib/logging-middleware';
import { capturePostHogEvent } from '@/lib/posthog-helpers';



type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

// Type for the Supabase client from our createClient utility

/**
 * Fetch all meter data for a house
 * Used by the Ablesungen modal - fetches apartments, meters, readings, and tenants in one call
 * Falls back to individual queries if database function is not available
 */
export async function getZaehlerForHausAction(hausId: string) {
  const supabase = await createClient();
  const startTime = Date.now();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // Try to use optimized database function first
    const { data, error } = await supabase.rpc('get_zaehler_for_haus', {
      haus_id_param: hausId,
      user_id_param: user.id
    });

    if (error) {
      // Check if error is due to function not existing
      // Using error code for PostgreSQL function not found (42883) or PostgREST not found (PGRST116)
      const isFunctionNotFound = error.code === '42883' || // PostgreSQL function does not exist
        error.code === 'PGRST116' || // PostgREST resource not found
        error.code === '42P01' || // PostgreSQL undefined_table
        (error.message && (
          error.message.includes('does not exist') ||
          error.message.includes('function') ||
          error.message.includes('not found')
        ));

      if (isFunctionNotFound) {
        console.log(`[${new Date().toISOString()}] [WARN] Database function not available, using fallback queries\nContext: ${JSON.stringify({
          functionName: 'get_zaehler_for_haus',
          hausId,
          userId: user.id,
          errorCode: error.code,
          errorMessage: error.message,
          fallbackReason: 'Function not found or not accessible'
        }, null, 2)}`);

        // Fallback to individual queries
        return await getZaehlerForHausFallback(supabase, hausId, user.id, startTime);
      }

      console.error("Error fetching meter data for house:", {
        errorCode: error.code,
        errorMessage: error.message,
        details: error.details,
        hint: error.hint
      });
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Keine Daten gefunden." };
    }

    const executionTime = Date.now() - startTime;
    const result = data[0];

    // Log successful RPC call
    console.log(`[${new Date().toISOString()}] [INFO] RPC call completed: get_zaehler_for_haus\nContext: ${JSON.stringify({
      functionName: 'get_zaehler_for_haus',
      executionTime,
      performanceLevel: executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow',
      success: true,
      hausId,
      userId: user.id,
      wohnungenCount: result.wohnungen?.length || 0,
      metersCount: result.zaehler?.length || 0,
      readingsCount: result.ablesungen?.length || 0
    }, null, 2)}`);

    return {
      success: true,
      data: {
        wohnungen: result.wohnungen || [],
        meters: result.zaehler || [],
        readings: result.ablesungen || [],
        mieter: result.mieter || []
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in getZaehlerForHausAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

// getWasserZaehlerForHausAction removed - use getZaehlerForHausAction

/**
 * Fallback function using individual queries
 * Used when database function is not available
 */

// Define a basic Wohnung interface that matches our database query
interface WohnungBasic {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id: string | null;
}

// Reuse existing types from data-fetching with proper type safety
interface MieterBasic extends Pick<Mieter, 'id' | 'name' | 'wohnung_id' | 'einzug' | 'auszug'> { }

interface FallbackResult {
  success: boolean;
  data: {
    wohnungen: WohnungBasic[];
    meters: Zaehler[];
    readings: Ablesung[];
    mieter: MieterBasic[];
  };
  message?: string;
}

/**
 * Fallback function that executes individual queries when the database function is not available
 * This is a performance fallback and should only be used when the optimized function is not available
 */
async function getZaehlerForHausFallback(
  supabase: SupabaseClientType,
  hausId: string,
  userId: string,
  startTime: number
): Promise<FallbackResult> {
  try {
    // Fetch apartments for the house with proper type casting
    const { data: wohnungen, error: wohnungenError } = await supabase
      .from("Wohnungen")
      .select("id, name, groesse, miete, haus_id")
      .eq("haus_id", hausId)
      .eq("user_id", userId)
      .order('name', { ascending: true });

    if (wohnungenError) {
      console.error("Error fetching apartments:", wohnungenError);
      throw wohnungenError;
    }

    const wohnungIds = wohnungen?.map((w: WohnungBasic) => w.id) || [];
    if (wohnungIds.length === 0) {
      // No apartments found for this house
      return {
        success: true,
        data: {
          wohnungen: [],
          meters: [],
          readings: [],
          mieter: []
        }
      };
    }

    // Fetch meters for the apartments with proper type casting
    const { data: meters, error: metersError } = await supabase
      .from("Zaehler")
      .select("*")
      .in("wohnung_id", wohnungIds)
      .eq("user_id", userId)
      .order('zaehler_typ', { ascending: true })
      .order('custom_id', { ascending: true });

    if (metersError) {
      console.error("Error fetching meters:", metersError);
      throw metersError;
    }

    const meterIds = meters?.map((m: Zaehler) => m.id) || [];

    // Execute readings and tenants queries in parallel
    // Execute parallel queries with proper type casting
    const [
      { data: readings, error: readingsError },
      { data: mieter, error: mieterError }
    ] = await Promise.all([
      // Fetch readings for the meters
      meterIds.length > 0
        ? supabase
          .from("Zaehler_Ablesungen")
          .select("*")
          .in("zaehler_id", meterIds)
          .eq("user_id", userId)
          .order('ablese_datum', { ascending: false })
        : { data: null, error: null },

      // Fetch tenants for the apartments
      supabase
        .from("Mieter")
        .select("id, name, wohnung_id, einzug, auszug")
        .in("wohnung_id", wohnungIds)
        .eq("user_id", userId)
        .order('name', { ascending: true })
    ]);

    // Handle potential errors from parallel queries
    if (readingsError) {
      console.error("Error fetching readings:", readingsError);
      throw readingsError;
    }

    if (mieterError) {
      console.error("Error fetching tenants:", mieterError);
      throw mieterError;
    }

    // Type assertions for the query results
    const typedReadings = (readings || []) as unknown as Ablesung[];
    const typedMieter = (mieter || []) as unknown as MieterBasic[];

    const executionTime = Date.now() - startTime;
    const performanceLevel = executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow';

    // Log fallback execution with performance metrics
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Fallback queries completed',
      method: 'getZaehlerForHausFallback',
      context: {
        performance: {
          executionTime,
          performanceLevel,
          queriesExecuted: 4
        },
        data: {
          hausId,
          userId,
          wohnungenCount: wohnungen?.length || 0,
          metersCount: meters?.length || 0,
          readingsCount: readings?.length || 0,
          mieterCount: mieter?.length || 0
        }
      }
    }, null, 2));

    return {
      success: true,
      data: {
        wohnungen: (wohnungen || []) as unknown as WohnungBasic[],
        meters: (meters || []) as unknown as Zaehler[],
        readings: typedReadings,
        mieter: typedMieter
      }
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error in fallback queries';
    console.error("Error in fallback queries:", {
      error: errorMessage,
      stack: error?.stack,
      code: error?.code,
      details: error?.details,
      hint: error?.hint
    });

    return {
      success: false,
      message: `Fallback-Fehler: ${errorMessage}`,
      data: {
        wohnungen: [],
        meters: [],
        readings: [],
        mieter: []
      }
    };
  }
}

/**
 * Fetch meter data for a specific apartment
 * Uses optimized database function for better performance
 */
export async function getZaehlerDataAction(wohnungId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // Use database function for optimized data fetching
    const { data, error } = await supabase.rpc('get_zaehler_data', {
      wohnung_id_param: wohnungId,
      user_id_param: user.id
    });

    if (error) {
      console.error("Error fetching meter data:", error);
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Keine Daten gefunden." };
    }

    const result = data[0];

    return {
      success: true,
      data: {
        wohnung: result.wohnung_data,
        meters: result.zaehler || [],
        readings: result.ablesungen || []
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in getZaehlerDataAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

// getWasserZaehlerDataAction removed - use getZaehlerDataAction

/**
 * Fetch readings for a specific meter
 * Uses optimized database function
 */
export async function getAblesenDataAction(meterId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data, error } = await supabase.rpc('get_ablesungen_for_meter', {
      meter_id_param: meterId,
      user_id_param: user.id
    });

    if (error) {
      console.error("Error fetching readings:", error);
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Keine Daten gefunden." };
    }

    const result = data[0];

    return {
      success: true,
      data: {
        meter: result.meter_data,
        readings: result.readings || []
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in getAblesenDataAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

// getWasserAblesenDataAction removed - use getAblesenDataAction

/**
 * Create a new meter
 */
export async function createZaehler(data: Omit<Zaehler, 'id' | 'user_id'>) {
  const actionName = 'createMeter';
  logAction(actionName, 'start', { apartment_id: data.wohnung_id });

  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logAction(actionName, 'error', { error_message: 'Benutzer nicht authentifiziert.' });
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data: result, error } = await supabase
      .from("Zaehler")
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();

    if (error) {
      logAction(actionName, 'error', { apartment_id: data.wohnung_id, error_message: error.message });
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    logAction(actionName, 'success', { meter_id: result?.id, apartment_id: data.wohnung_id });

    // PostHog Event Tracking
    await capturePostHogEvent(user.id, 'meter_created', {
      meter_id: result?.id,
      apartment_id: data.wohnung_id,
      source: 'server_action'
    });


    return { success: true, data: result };
  } catch (error: any) {
    logAction(actionName, 'error', { apartment_id: data.wohnung_id, error_message: error.message });
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Update a meter
 */
export async function updateZaehler(id: string, data: Partial<Omit<Zaehler, 'id' | 'user_id'>>) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the meter exists and belongs to the user
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Zaehler")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Zähler nicht gefunden." };
    }

    if (existingMeter.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Aktualisieren dieses Zählers." };
    }

    // Update the meter with user_id check
    const { data: result, error } = await supabase
      .from("Zaehler")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure the meter belongs to the user
      .select()
      .single();

    if (error) {
      console.error("Error updating meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    await capturePostHogEvent(user.id, 'meter_updated', {
      meter_id: id,
      apartment_id: result?.wohnung_id,
      ...(data.custom_id !== undefined && { custom_id: data.custom_id }),
      ...(data.eichungsdatum !== undefined && { eichungsdatum: data.eichungsdatum }),
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in updateZaehler:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Delete a meter
 */
export async function deleteZaehler(id: string) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the meter exists and belongs to the user
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Zaehler")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Zähler nicht gefunden." };
    }

    if (existingMeter.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Löschen dieses Zählers." };
    }

    // Delete the meter with user_id check
    const { error } = await supabase
      .from("Zaehler")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure the meter belongs to the user

    if (error) {
      console.error("Error deleting meter:", error);
      return { success: false, message: error.message };
    }

    // PostHog Event Tracking
    await capturePostHogEvent(user.id, 'meter_deleted', {
      meter_id: id,
      source: 'server_action'
    });

    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteZaehler:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Create a new reading
 */
export async function createAblesung(data: Omit<Ablesung, 'id' | 'user_id'>) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error("Error creating reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    await capturePostHogEvent(user.id, 'reading_recorded', {
      reading_id: result?.id,
      meter_id: data.zaehler_id,
      reading_value: data.zaehlerstand,
      reading_date: data.ablese_datum,
      source: 'server_action'
    });


    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in createAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Update a reading
 */
export async function updateAblesung(id: string, data: Partial<Omit<Ablesung, 'id' | 'user_id'>>) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water reading exists and belongs to the user
    const { data: existingReading, error: fetchError } = await supabase
      .from("Zaehler_Ablesungen")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReading) {
      return { success: false, message: "Ablesung nicht gefunden." };
    }

    if (existingReading.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Aktualisieren dieser Ablesung." };
    }

    // Update the reading with user_id check
    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure the reading belongs to the user
      .select()
      .single();

    if (error) {
      console.error("Error updating reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    await capturePostHogEvent(user.id, 'reading_updated', {
      reading_id: id,
      meter_id: result?.zaehler_id,
      reading_value: result?.zaehlerstand,
      reading_date: result?.ablese_datum,
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in updateAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Delete a reading
 */
export async function deleteAblesung(id: string) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water reading exists and belongs to the user
    const { data: existingReading, error: fetchError } = await supabase
      .from("Zaehler_Ablesungen")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReading) {
      return { success: false, message: "Ablesung nicht gefunden." };
    }

    if (existingReading.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Löschen dieser Ablesung." };
    }

    // Delete the reading with user_id check
    const { error } = await supabase
      .from("Zaehler_Ablesungen")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure the reading belongs to the user

    if (error) {
      console.error("Error deleting reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Bulk create readings
 */
export async function bulkCreateAblesungen(readings: Omit<Ablesung, 'id' | 'user_id'>[]) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    if (readings.length === 0) {
      return { success: true, data: [] };
    }

    // Extract unique meter IDs from the readings, filtering out any null values
    const meterIds = [...new Set(readings.map(r => r.zaehler_id).filter((id): id is string => !!id))];

    // Verify ownership of all meters
    const { data: meters, error: metersError } = await supabase
      .from("Zaehler")
      .select('id')
      .in('id', meterIds)
      .eq('user_id', user.id);

    if (metersError) {
      console.error("Error verifying meter ownership:", metersError);
      return { success: false, message: "Fehler bei der Überprüfung der Zähler." };
    }

    const ownedMeterIds = new Set(meters?.map(m => m.id) || []);

    // Filter readings for owned meters
    const validReadings = readings.filter(r => ownedMeterIds.has(r.zaehler_id))
      .map(r => ({ ...r, user_id: user.id }));

    if (validReadings.length === 0) {
      return { success: false, message: "Keine gültigen Zähler gefunden, für die Sie berechtigt sind." };
    }

    if (validReadings.length !== readings.length) {
      console.warn("Some readings were skipped due to permission issues.");
    }

    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .insert(validReadings)
      .select();

    if (error) {
      console.error("Error bulk creating readings:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking for Bulk Operation
    await capturePostHogEvent(user.id, 'readings_bulk_created', {
      reading_count: validReadings.length,
      meter_ids: Array.from(new Set(validReadings.map(r => r.zaehler_id))),
      source: 'server_action'
    });


    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in bulkCreateAblesungen:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}
