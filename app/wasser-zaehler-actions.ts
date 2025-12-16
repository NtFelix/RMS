"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { WasserZaehler, WasserAblesung, Wohnung, Mieter } from "@/lib/data-fetching";
import { logAction } from '@/lib/logging-middleware';
import { getPostHogServer } from '@/app/posthog-server.mjs';
import { logger } from '@/utils/logger';
import { posthogLogger } from '@/lib/posthog-logger';



type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

// Type for the Supabase client from our createClient utility

/**
 * Fetch all water meter data for a house
 * Used by the Ablesungen modal - fetches apartments, meters, readings, and tenants in one call
 * Falls back to individual queries if database function is not available
 */
export async function getWasserZaehlerForHausAction(hausId: string) {
  const supabase = await createClient();
  const startTime = Date.now();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // Try to use optimized database function first
    const { data, error } = await supabase.rpc('get_wasser_zaehler_for_haus', {
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
          functionName: 'get_wasser_zaehler_for_haus',
          hausId,
          userId: user.id,
          errorCode: error.code,
          errorMessage: error.message,
          fallbackReason: 'Function not found or not accessible'
        }, null, 2)}`);

        // Fallback to individual queries
        return await getWasserZaehlerForHausFallback(supabase, hausId, user.id, startTime);
      }

      console.error("Error fetching water meter data for house:", {
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
    console.log(`[${new Date().toISOString()}] [INFO] RPC call completed: get_wasser_zaehler_for_haus\nContext: ${JSON.stringify({
      functionName: 'get_wasser_zaehler_for_haus',
      executionTime,
      performanceLevel: executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow',
      success: true,
      hausId,
      userId: user.id,
      wohnungenCount: result.wohnungen?.length || 0,
      metersCount: result.water_meters?.length || 0,
      readingsCount: result.water_readings?.length || 0
    }, null, 2)}`);

    return {
      success: true,
      data: {
        wohnungen: result.wohnungen || [],
        waterMeters: result.water_meters || [],
        waterReadings: result.water_readings || [],
        mieter: result.mieter || []
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in getWasserZaehlerForHausAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

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
    waterMeters: WasserZaehler[];
    waterReadings: WasserAblesung[];
    mieter: MieterBasic[];
  };
  message?: string;
}

/**
 * Fallback function that executes individual queries when the database function is not available
 * This is a performance fallback and should only be used when the optimized function is not available
 */
async function getWasserZaehlerForHausFallback(
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
          waterMeters: [],
          waterReadings: [],
          mieter: []
        }
      };
    }

    // Fetch water meters for the apartments with proper type casting
    const { data: waterMeters, error: metersError } = await supabase
      .from("Wasser_Zaehler")
      .select("*")
      .in("wohnung_id", wohnungIds)
      .eq("user_id", userId)
      .order('custom_id', { ascending: true });

    if (metersError) {
      console.error("Error fetching water meters:", metersError);
      throw metersError;
    }

    const meterIds = waterMeters?.map((m: WasserZaehler) => m.id) || [];

    // Execute water readings and tenants queries in parallel
    // Execute parallel queries with proper type casting
    const [
      { data: waterReadings, error: readingsError },
      { data: mieter, error: mieterError }
    ] = await Promise.all([
      // Fetch water readings for the meters
      meterIds.length > 0
        ? supabase
          .from("Wasser_Ablesungen")
          .select("*")
          .in("wasser_zaehler_id", meterIds)
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
      console.error("Error fetching water readings:", readingsError);
      throw readingsError;
    }

    if (mieterError) {
      console.error("Error fetching tenants:", mieterError);
      throw mieterError;
    }

    // Type assertions for the query results
    const typedWaterReadings = (waterReadings || []) as unknown as WasserAblesung[];
    const typedMieter = (mieter || []) as unknown as MieterBasic[];

    const executionTime = Date.now() - startTime;
    const performanceLevel = executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow';

    // Log fallback execution with performance metrics
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Fallback queries completed',
      method: 'getWasserZaehlerForHausFallback',
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
          metersCount: waterMeters?.length || 0,
          readingsCount: waterReadings?.length || 0,
          mieterCount: mieter?.length || 0
        }
      }
    }, null, 2));

    return {
      success: true,
      data: {
        wohnungen: (wohnungen || []) as unknown as WohnungBasic[],
        waterMeters: (waterMeters || []) as unknown as WasserZaehler[],
        waterReadings: typedWaterReadings,
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
        waterMeters: [],
        waterReadings: [],
        mieter: []
      }
    };
  }
}

/**
 * Fetch water meter data for a specific apartment
 * Uses optimized database function for better performance
 */
export async function getWasserZaehlerDataAction(wohnungId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // Use database function for optimized data fetching
    const { data, error } = await supabase.rpc('get_wasser_zaehler_data', {
      wohnung_id_param: wohnungId,
      user_id_param: user.id
    });

    if (error) {
      console.error("Error fetching water meter data:", error);
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
        waterMeters: result.water_meters || [],
        waterReadings: result.water_readings || []
      }
    };
  } catch (error: any) {
    console.error("Unexpected error in getWasserZaehlerDataAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Fetch water readings for a specific meter
 * Uses optimized database function
 */
export async function getWasserAblesenDataAction(meterId: string) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data, error } = await supabase.rpc('get_wasser_ablesungen_for_meter', {
      meter_id_param: meterId,
      user_id_param: user.id
    });

    if (error) {
      console.error("Error fetching water readings:", error);
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
    console.error("Unexpected error in getWasserAblesenDataAction:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Create a new water meter
 */
export async function createWasserZaehler(data: Omit<WasserZaehler, 'id' | 'user_id'>) {
  const actionName = 'createWaterMeter';
  logAction(actionName, 'start', { apartment_id: data.wohnung_id });

  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logAction(actionName, 'error', { error_message: 'Benutzer nicht authentifiziert.' });
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data: result, error } = await supabase
      .from("Wasser_Zaehler")
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
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: 'water_meter_created',
        properties: {
          meter_id: result?.id,
          apartment_id: data.wohnung_id,
          source: 'server_action'
        }
      });
      await posthog.flush();
      await posthogLogger.flush();
      logger.info(`[PostHog] Capturing event: water_meter_created for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }


    return { success: true, data: result };
  } catch (error: any) {
    logAction(actionName, 'error', { apartment_id: data.wohnung_id, error_message: error.message });
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Update a water meter
 */
export async function updateWasserZaehler(id: string, data: Partial<Omit<WasserZaehler, 'id' | 'user_id'>>) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water meter exists and belongs to the user
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Wasser_Zaehler")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Wasserzähler nicht gefunden." };
    }

    if (existingMeter.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Aktualisieren dieses Wasserzählers." };
    }

    // Update the water meter with user_id check
    const { data: result, error } = await supabase
      .from("Wasser_Zaehler")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure the meter belongs to the user
      .select()
      .single();

    if (error) {
      console.error("Error updating water meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: 'water_meter_updated',
        properties: {
          meter_id: id,
          apartment_id: result?.wohnung_id,
          source: 'server_action'
        }
      });
      await posthog.flush();
      await posthogLogger.flush();
      logger.info(`[PostHog] Capturing event: water_meter_updated for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in updateWasserZaehler:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Delete a water meter
 */
export async function deleteWasserZaehler(id: string) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water meter exists and belongs to the user
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Wasser_Zaehler")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Wasserzähler nicht gefunden." };
    }

    if (existingMeter.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Löschen dieses Wasserzählers." };
    }

    // Delete the water meter with user_id check
    const { error } = await supabase
      .from("Wasser_Zaehler")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure the meter belongs to the user

    if (error) {
      console.error("Error deleting water meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteWasserZaehler:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Create a new water reading
 */
export async function createWasserAblesung(data: Omit<WasserAblesung, 'id' | 'user_id'>) {
  const supabase = await createClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data: result, error } = await supabase
      .from("Wasser_Ablesungen")
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error("Error creating water reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: 'water_reading_recorded',
        properties: {
          reading_id: result?.id,
          meter_id: data.wasser_zaehler_id,
          reading_value: data.zaehlerstand,
          reading_date: data.ablese_datum,
          source: 'server_action'
        }
      });
      await posthog.flush();
      await posthogLogger.flush();
      logger.info(`[PostHog] Capturing event: water_reading_recorded for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }


    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in createWasserAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Update a water reading
 */
export async function updateWasserAblesung(id: string, data: Partial<Omit<WasserAblesung, 'id' | 'user_id'>>) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water reading exists and belongs to the user
    const { data: existingReading, error: fetchError } = await supabase
      .from("Wasser_Ablesungen")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReading) {
      return { success: false, message: "Wasserablesung nicht gefunden." };
    }

    if (existingReading.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Aktualisieren dieser Wasserablesung." };
    }

    // Update the water reading with user_id check
    const { data: result, error } = await supabase
      .from("Wasser_Ablesungen")
      .update(data)
      .eq("id", id)
      .eq("user_id", user.id) // Ensure the reading belongs to the user
      .select()
      .single();

    if (error) {
      console.error("Error updating water reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: 'water_reading_updated',
        properties: {
          reading_id: id,
          meter_id: result?.wasser_zaehler_id,
          reading_value: result?.zaehlerstand,
          reading_date: result?.ablese_datum,
          source: 'server_action'
        }
      });
      await posthog.flush();
      await posthogLogger.flush();
      logger.info(`[PostHog] Capturing event: water_reading_updated for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in updateWasserAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Delete a water reading
 */
export async function deleteWasserAblesung(id: string) {
  const supabase = await createClient();

  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    // First verify the water reading exists and belongs to the user
    const { data: existingReading, error: fetchError } = await supabase
      .from("Wasser_Ablesungen")
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingReading) {
      return { success: false, message: "Wasserablesung nicht gefunden." };
    }

    if (existingReading.user_id !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Löschen dieser Wasserablesung." };
    }

    // Delete the water reading with user_id check
    const { error } = await supabase
      .from("Wasser_Ablesungen")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure the reading belongs to the user

    if (error) {
      console.error("Error deleting water reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error in deleteWasserAblesung:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}

/**
 * Bulk create water readings
 */
export async function bulkCreateWasserAblesungen(readings: Omit<WasserAblesung, 'id' | 'user_id'>[]) {
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
    const meterIds = [...new Set(readings.map(r => r.wasser_zaehler_id).filter((id): id is string => !!id))];

    // Verify ownership of all meters
    const { data: meters, error: metersError } = await supabase
      .from("Wasser_Zaehler")
      .select('id')
      .in('id', meterIds)
      .eq('user_id', user.id);

    if (metersError) {
      console.error("Error verifying meter ownership:", metersError);
      return { success: false, message: "Fehler bei der Überprüfung der Zähler." };
    }

    const ownedMeterIds = new Set(meters?.map(m => m.id) || []);

    // Filter readings for owned meters
    const validReadings = readings.filter(r => ownedMeterIds.has(r.wasser_zaehler_id))
      .map(r => ({ ...r, user_id: user.id }));

    if (validReadings.length === 0) {
      return { success: false, message: "Keine gültigen Zähler gefunden, für die Sie berechtigt sind." };
    }

    if (validReadings.length !== readings.length) {
      console.warn("Some readings were skipped due to permission issues.");
    }

    const { data: result, error } = await supabase
      .from("Wasser_Ablesungen")
      .insert(validReadings)
      .select();

    if (error) {
      console.error("Error bulk creating water readings:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    // PostHog Event Tracking for Bulk Operation
    try {
      const posthog = getPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: 'water_readings_bulk_created',
        properties: {
          reading_count: validReadings.length,
          meter_ids: Array.from(new Set(validReadings.map(r => r.wasser_zaehler_id))),
          source: 'server_action'
        }
      });
      await posthog.flush();
      await posthogLogger.flush();
      logger.info(`[PostHog] Capturing event: water_readings_bulk_created for user: ${user.id}`);
    } catch (phError) {
      logger.error('Failed to capture PostHog event:', phError instanceof Error ? phError : new Error(String(phError)));
    }


    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in bulkCreateWasserAblesungen:", error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${error.message}` };
  }
}
