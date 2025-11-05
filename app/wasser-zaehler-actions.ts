"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { WasserZaehler, WasserAblesung } from "@/lib/data-fetching";

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
      const errorMessage = error.message || '';
      if (errorMessage.includes('does not exist') || 
          errorMessage.includes('function') || 
          errorMessage.includes('not found')) {
        
        console.log(`[${new Date().toISOString()}] [WARN] Database function not available, using fallback queries\nContext: ${JSON.stringify({
          functionName: 'get_wasser_zaehler_for_haus',
          hausId,
          userId: user.id,
          fallbackReason: 'Function does not exist'
        }, null, 2)}`);

        // Fallback to individual queries
        return await getWasserZaehlerForHausFallback(supabase, hausId, user.id, startTime);
      }

      console.error("Error fetching water meter data for house:", error);
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
async function getWasserZaehlerForHausFallback(
  supabase: any,
  hausId: string,
  userId: string,
  startTime: number
) {
  try {
    // Fetch apartments
    const { data: wohnungen, error: wohnungenError } = await supabase
      .from("Wohnungen")
      .select("id, name, groesse, miete, haus_id")
      .eq("haus_id", hausId)
      .eq("user_id", userId);

    if (wohnungenError) throw wohnungenError;

    const wohnungIds = wohnungen?.map((w: any) => w.id) || [];

    // Fetch water meters
    const { data: waterMeters, error: metersError } = await supabase
      .from("Wasser_Zaehler")
      .select("*")
      .in("wohnung_id", wohnungIds)
      .eq("user_id", userId);

    if (metersError) throw metersError;

    const meterIds = waterMeters?.map((m: any) => m.id) || [];

    // Fetch water readings
    const { data: waterReadings, error: readingsError } = await supabase
      .from("Wasser_Ablesungen")
      .select("*")
      .in("wasser_zaehler_id", meterIds)
      .eq("user_id", userId);

    if (readingsError) throw readingsError;

    // Fetch tenants
    const { data: mieter, error: mieterError } = await supabase
      .from("Mieter")
      .select("id, name, wohnung_id, einzug, auszug")
      .in("wohnung_id", wohnungIds)
      .eq("user_id", userId);

    if (mieterError) throw mieterError;

    const executionTime = Date.now() - startTime;

    // Log fallback execution
    console.log(`[${new Date().toISOString()}] [INFO] Fallback queries completed\nContext: ${JSON.stringify({
      method: 'fallback',
      executionTime,
      performanceLevel: executionTime < 200 ? 'fast' : executionTime < 500 ? 'medium' : 'slow',
      success: true,
      hausId,
      userId,
      wohnungenCount: wohnungen?.length || 0,
      metersCount: waterMeters?.length || 0,
      readingsCount: waterReadings?.length || 0,
      queriesExecuted: 4
    }, null, 2)}`);

    return {
      success: true,
      data: {
        wohnungen: wohnungen || [],
        waterMeters: waterMeters || [],
        waterReadings: waterReadings || [],
        mieter: mieter || []
      }
    };
  } catch (error: any) {
    console.error("Error in fallback queries:", error);
    return { success: false, message: `Fallback-Fehler: ${error.message}` };
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
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Benutzer nicht authentifiziert." };
    }

    const { data: result, error } = await supabase
      .from("Wasser_Zaehler")
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error("Error creating water meter:", error);
      return { success: false, message: error.message };
    }

    revalidatePath("/betriebskosten");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Unexpected error in createWasserZaehler:", error);
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
    const { error } = await supabase
      .from("Wasser_Ablesungen")
      .delete()
      .eq("id", id);

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
