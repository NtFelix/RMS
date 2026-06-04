"use server";

import { ensureAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { type SupabaseClient } from "@supabase/supabase-js";
import type { Zaehler, ZaehlerAblesung, Wohnung, Mieter } from "@/lib/types";
import { logAction } from '@/lib/logging-middleware';
import { capturePostHogEvent } from '@/lib/posthog-helpers';

type SupabaseClientType = SupabaseClient;

/**
 * Fetch all meter data for a house
 * Used by the Ablesungen modal - fetches apartments, meters, readings, and tenants in one call
 * Falls back to individual queries if database function is not available
 */
export async function getMeterForHausAction(hausId: string) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }
  const startTime = Date.now();

  try {

    // Try to use optimized database function first
    const { data, error } = await supabase.rpc('get_zaehler_for_haus', {
      haus_id_param: hausId
    });

    if (error) {
      // Check if error is due to function not existing
      const isFunctionNotFound = error.code === '42883' || // PostgreSQL function does not exist
        error.code === 'PGRST116' || // PostgREST resource not found
        error.code === '42P01' || // PostgreSQL undefined_table
        (error.message && (
          error.message.includes('does not exist') ||
          error.message.includes('function') ||
          error.message.includes('not found')
        ));

      if (isFunctionNotFound) {
        console.log(`[${new Date().toISOString()}] [WARN] Database function 'get_zaehler_for_haus' not available, using fallback queries`);

        // Fallback to individual queries
        return await getMeterForHausFallback(supabase, hausId, user.id, startTime);
      }

      console.error("Error fetching meter data for house:", error);
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Keine Daten gefunden." };
    }

    const executionTime = Date.now() - startTime;
    const result = data[0];

    // Log successful RPC call
    // Log successful RPC call
    console.log(`[${new Date().toISOString()}] [INFO] RPC call completed: get_zaehler_for_haus
Context: ${JSON.stringify({
      functionName: 'get_zaehler_for_haus',
      executionTime,
      performanceLevel: executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow',
      success: true,
      hausId,
      userId: user.id,
      wohnungenCount: result.wohnungen?.length || 0,
      metersCount: result.meters?.length || 0,
      readingsCount: result.readings?.length || 0
    }, null, 2)}`);

    return {
      success: true,
      data: {
        wohnungen: result.wohnungen || [],
        meters: result.meters || [],
        readings: result.readings || [],
        mieter: result.mieter || []
      }
    };
  } catch (error: unknown) {
    console.error("Unexpected error in getMeterForHausAction:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Backward compatibility alias
export const getWasserZaehlerForHausAction = getMeterForHausAction;

/**
 * Fallback function using individual queries
 */
interface WohnungBasic {
  id: string;
  name: string;
  groesse: number;
  miete: number;
  haus_id: string | null;
}

interface MieterBasic extends Pick<Mieter, 'id' | 'name' | 'wohnung_id' | 'einzug' | 'auszug'> { }

interface FallbackResult {
  success: boolean;
  data: {
    wohnungen: WohnungBasic[];
    meters: Zaehler[];
    readings: ZaehlerAblesung[];
    mieter: MieterBasic[];
  };
  message?: string;
}

async function getMeterForHausFallback(
  supabase: SupabaseClientType,
  hausId: string,
  userId: string,
  startTime: number
): Promise<FallbackResult> {
  try {
    const { data: wohnungen, error: wohnungenError } = await supabase
      .from("Wohnungen")
      .select("id, name, groesse, miete, haus_id")
      .eq("haus_id", hausId)
      .eq("erstellt_von", userId)
      .order('name', { ascending: true });

    if (wohnungenError) throw wohnungenError;

    const wohnungIds = wohnungen?.map((w: WohnungBasic) => w.id) || [];
    if (wohnungIds.length === 0) {
      return {
        success: true,
        data: { wohnungen: [], meters: [], readings: [], mieter: [] }
      };
    }

    const { data: meters, error: metersError } = await supabase
      .from("Zaehler")
      .select("*")
      .in("wohnung_id", wohnungIds)
      .eq("erstellt_von", userId)
      .order('custom_id', { ascending: true });

    if (metersError) throw metersError;

    const meterIds = meters?.map((m: Zaehler) => m.id) || [];

    const [
      { data: readings, error: readingsError },
      { data: mieter, error: mieterError }
    ] = await Promise.all([
      meterIds.length > 0
        ? supabase
          .from("Zaehler_Ablesungen")
          .select("*")
          .in("zaehler_id", meterIds)
          .eq("user_id", userId)
          .order('ablese_datum', { ascending: false })
        : { data: null, error: null },

      supabase
        .from("Mieter")
        .select("id, name, wohnung_id, einzug, auszug")
        .in("wohnung_id", wohnungIds)
        .eq("erstellt_von", userId)
        .order('name', { ascending: true })
    ]);

    if (readingsError) throw readingsError;
    if (mieterError) throw mieterError;

    return {
      success: true,
      data: {
        wohnungen: (wohnungen || []) as unknown as WohnungBasic[],
        meters: (meters || []) as unknown as Zaehler[],
        readings: (readings || []) as unknown as ZaehlerAblesung[],
        mieter: (mieter || []) as unknown as MieterBasic[]
      }
    };
  } catch (error: unknown) {
    console.error("Error in fallback queries:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Fallback-Fehler: ${errorMessage}`,
      data: { wohnungen: [], meters: [], readings: [], mieter: [] }
    };
  }
}

/**
 * Fetch meter data for a specific apartment
 */
export async function getZaehlerDataAction(wohnungId: string) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    const { data, error } = await supabase.rpc('get_zaehler_data', {
      wohnung_id_param: wohnungId
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
        meters: result.meters || [],
        readings: result.readings || []
      }
    };
  } catch (error: unknown) {
    console.error("Unexpected error in getZaehlerDataAction:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const getWasserZaehlerDataAction = getZaehlerDataAction;

/**
 * Fetch readings for a specific meter
 */
export async function getAblesungenForZaehlerAction(zaehlerId: string) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    const { data, error } = await supabase.rpc('get_ablesungen_for_zaehler', {
      zaehler_id_param: zaehlerId
    });

    if (error) {
      console.error("Error fetching meter readings:", error);
      return { success: false, message: error.message };
    }

    if (!data || data.length === 0) {
      return { success: false, message: "Keine Daten gefunden." };
    }

    const result = data[0];

    return {
      success: true,
      data: {
        zaehler: result.zaehler_data,
        readings: result.readings || []
      }
    };
  } catch (error: unknown) {
    console.error("Unexpected error in getAblesungenForZaehlerAction:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const getWasserAblesenDataAction = getAblesungenForZaehlerAction;


/**
 * Fetch readings for multiple meters
 */
export async function getReadingsForMetersAction(meterIds: string[]) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    if (!meterIds || meterIds.length === 0) {
      return { success: true, data: [] };
    }

    // Limit to 1000 IDs to stay within safe bounds, though array method handles this largely well
    // If needed, we could chunk requests, but standard usage won't exceed this.
    if (meterIds.length > 1000) {
      console.warn("Too many meter IDs provided to getReadingsForMetersAction. Processing first 1000 IDs only.");
      meterIds = meterIds.slice(0, 1000);
    }

    const { data, error } = await supabase
      .from("Zaehler_Ablesungen")
      .select("*")
      .in("zaehler_id", meterIds)
      .eq("user_id", user.id);

    if (error) throw error;

    return { success: true, data: data as ZaehlerAblesung[] };
  } catch (error: unknown) {
    console.error("Error fetching readings for meters:", error);
    return { success: false, message: error instanceof Error ? error.message : "An unknown error occurred." };
  }
}

/**
 * Create a new meter
 */
export async function createZaehler(data: Omit<Zaehler, 'id' | 'erstellt_von'>) {
  const actionName = 'createMeter';
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : 'Benutzer nicht authentifiziert.';
    logAction(actionName, 'error', { error_message: errorMessage });
    return { success: false, message: errorMessage };
  }
  logAction(actionName, 'start', { apartment_id: data.wohnung_id });

  try {

    const { data: result, error } = await supabase
      .from("Zaehler")
      .insert([{ ...data, erstellt_von: user.id }])
      .select()
      .single();

    if (error) {
      logAction(actionName, 'error', { apartment_id: data.wohnung_id, error_message: error.message });
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    logAction(actionName, 'success', { meter_id: result?.id, apartment_id: data.wohnung_id });

    await capturePostHogEvent(user.id, 'meter_created', {
      meter_id: result?.id,
      apartment_id: data.wohnung_id,
      meter_type: data.zaehler_typ,
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logAction(actionName, 'error', { apartment_id: data.wohnung_id, error_message: errorMessage });
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const createWasserZaehler = createZaehler;

/**
 * Update a meter
 */
export async function updateZaehler(id: string, data: Partial<Omit<Zaehler, 'id' | 'erstellt_von'>>) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    // Pre-check for better error messages
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Zaehler")
      .select('id, erstellt_von')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Zähler nicht gefunden." };
    }

    if (existingMeter.erstellt_von !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Aktualisieren dieses Zählers." };
    }

    const { data: result, error } = await supabase
      .from("Zaehler")
      .update(data)
      .eq("id", id)
      .eq("erstellt_von", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    await capturePostHogEvent(user.id, 'meter_updated', {
      meter_id: id,
      apartment_id: result?.wohnung_id,
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Unexpected error in updateZaehler:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const updateWasserZaehler = updateZaehler;

/**
 * Delete a meter
 */
export async function deleteZaehler(id: string) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    // Pre-check for better error messages
    const { data: existingMeter, error: fetchError } = await supabase
      .from("Zaehler")
      .select('id, erstellt_von')
      .eq('id', id)
      .single();

    if (fetchError || !existingMeter) {
      return { success: false, message: "Zähler nicht gefunden." };
    }

    if (existingMeter.erstellt_von !== user.id) {
      return { success: false, message: "Keine Berechtigung zum Löschen dieses Zählers." };
    }

    const { error } = await supabase
      .from("Zaehler")
      .delete()
      .eq("id", id)
      .eq("erstellt_von", user.id);

    if (error) {
      console.error("Error deleting meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error in deleteZaehler:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const deleteWasserZaehler = deleteZaehler;

/**
 * Create a new reading
 */
export async function createAblesung(data: Omit<ZaehlerAblesung, 'id' | 'erstellt_von' | 'organisation_id'>) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error("Error creating reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    await capturePostHogEvent(user.id, 'meter_reading_recorded', {
      reading_id: result?.id,
      meter_id: data.zaehler_id,
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Unexpected error in createAblesung:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const createWasserAblesung = createAblesung;

/**
 * Update a reading
 */
export async function updateAblesung(id: string, data: Partial<Omit<ZaehlerAblesung, 'id' | 'erstellt_von' | 'organisation_id'>>) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");

    await capturePostHogEvent(user.id, 'meter_reading_updated', {
      reading_id: id,
      meter_id: result?.zaehler_id,
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Unexpected error in updateAblesung:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const updateWasserAblesung = updateAblesung;

/**
 * Delete a reading
 */
export async function deleteAblesung(id: string) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    const { error } = await supabase
      .from("Zaehler_Ablesungen")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting reading:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true };
  } catch (error: unknown) {
    console.error("Unexpected error in deleteAblesung:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const deleteWasserAblesung = deleteAblesung;

/**
 * Bulk create readings
 */
export async function bulkCreateAblesungen(readings: Omit<ZaehlerAblesung, 'id' | 'erstellt_von' | 'organisation_id'>[]) {
  let user, supabase;
  try {
    ({ user, supabase } = await ensureAuth());
  } catch (authError: unknown) {
    const errorMessage = authError instanceof Error ? authError.message : "Nicht authentifiziert";
    return { success: false, message: errorMessage };
  }

  try {

    if (readings.length === 0) {
      return { success: true, data: [] };
    }

    const meterIds = Array.from(new Set(readings.map(r => r.zaehler_id).filter((id): id is string => !!id)));

    const { data: meters, error: metersError } = await supabase
      .from("Zaehler")
      .select('id')
      .in('id', meterIds);

    if (metersError) throw metersError;

    const ownedMeterIds = new Set(meters?.map(m => m.id) || []);
    const validReadings = readings
      .filter(r => ownedMeterIds.has(r.zaehler_id))
      .map(r => r as ZaehlerAblesung);

    if (validReadings.length === 0) {
      return { success: false, message: "Keine gültigen Zähler gefunden, für die Sie berechtigt sind." };
    }

    const { data: result, error } = await supabase
      .from("Zaehler_Ablesungen")
      .insert(validReadings)
      .select();

    if (error) throw error;

    revalidatePath("/betriebskosten");

    await capturePostHogEvent(user.id, 'meter_readings_bulk_created', {
      reading_count: validReadings.length,
      meter_ids: Array.from(new Set(validReadings.map(r => r.zaehler_id))),
      source: 'server_action'
    });

    return { success: true, data: result };
  } catch (error: unknown) {
    console.error("Unexpected error in bulkCreateAblesungen:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${errorMessage}` };
  }
}

// Legacy alias
export const bulkCreateWasserAblesungen = bulkCreateAblesungen;
