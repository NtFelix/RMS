import { createSupabaseServerClient } from "./supabase-server";

export type Wohnung = {
  id: string;
  groesse: number;
  name: string;
  miete: number;
  user_id: string;
  haus_id: string | null;
};

export type Haus = {
  id: string;
  ort: string | null;
  name: string;
  user_id: string;
  strasse: string | null;
  groesse?: number | null;
};

import { NebenkostenEntry } from "../types/Tenant";

export type Mieter = {
  id: string;
  wohnung_id: string | null;
  name: string;
  einzug: string | null;
  auszug: string | null;
  email: string | null;
  telefonnummer: string | null;
  notiz: string | null;
  nebenkosten: NebenkostenEntry[] | null;
  user_id: string;
  Wohnungen?: { // Make it optional as not all Mieter queries might join this
    name: string;
    groesse: number;
    // id and miete can be added if consistently selected and needed elsewhere
  } | null; // Allow it to be null if the join returns no matching Wohnung
};

export type Aufgabe = {
  id: string;
  user_id: string;
  ist_erledigt: boolean;
  name: string;
  beschreibung: string;
  erstellungsdatum: string;
  aenderungsdatum: string;
};

export type HausMitFlaeche = {
  id: string;
  name: string;
  gesamtFlaeche: number;
  anzahlWohnungen: number;
  anzahlMieter: number;
};

export type Nebenkosten = {
  id: string;
  startdatum: string; // ISO date string (YYYY-MM-DD)
  enddatum: string;   // ISO date string (YYYY-MM-DD)
  nebenkostenart: string[] | null;
  betrag: number[] | null;
  berechnungsart: string[] | null;
  wasserkosten: number | null;
  wasserverbrauch: number | null; // Changed from optional to required for consistency
  haeuser_id: string;
  user_id: string; // Changed from optional to required for consistency
  Haeuser?: { name: string } | null;
  Rechnungen?: RechnungSql[] | null;
  gesamtFlaeche?: number; // Added for total area (calculated field)
  anzahlWohnungen?: number; // Number of apartments (calculated field)
  anzahlMieter?: number; // Number of tenants (calculated field)
};

export type NebenkostenChartData = {
  year: number;
  data: {
    name: string;
    value: number;
  }[];
};

export type NebenkostenChartDatum = {
  name: string;
  value: number;
};

// Added as per subtask
export interface Rechnung {
  id: string;
  user_id: string;
  nebenkosten_id: string | null;
  mieter_id: string | null;
  name: string; // This should correspond to a 'nebenkostenart'
  betrag: number | null;
  // Add any other relevant fields from the 'Rechnungen' table
}

export type RechnungSql = {
  id: string;
  nebenkosten_id: string;
  mieter_id: string;
  betrag: number;
  name: string;
  user_id: string;
  // Add other fields from your Rechnungen table schema if needed
};

// Meter type definitions for multi-meter support
// Re-exported from zaehler-types.ts for backward compatibility
export type { ZaehlerTyp } from './zaehler-types';
export { ZAEHLER_CONFIG, getZaehlerLabel, getZaehlerEinheit } from './zaehler-types';
import type { ZaehlerTyp } from './zaehler-types';

// Water meter types for new calculation logic (using Zaehler table)
export type WasserZaehler = {
  id: string;
  custom_id: string | null;
  wohnung_id: string | null;
  erstellungsdatum: string; // ISO date string
  eichungsdatum: string | null; // ISO date string
  user_id: string;
  ist_aktiv: boolean; // Indicates if meter is active
  zaehler_typ: ZaehlerTyp; // Type of meter
  einheit: string; // Unit of measurement
};

export type WasserAblesung = {
  id: string;
  ablese_datum: string; // ISO date string
  zaehlerstand: number | null;
  verbrauch: number;
  user_id: string | null;
  zaehler_id: string; // Updated from wasser_zaehler_id - matches new database schema
  kommentar?: string | null;
};

// Legacy type removed - now using Zaehler + Zaehler_Ablesungen tables
// This type is kept for backward compatibility in form data structures only
export type Wasserzaehler = {
  id: string;
  nebenkosten_id: string;
  mieter_id: string;
  ablese_datum: string;
  zaehlerstand: number;
  verbrauch: number;
  user_id: string;
};

export type Finanzen = {
  id: string;
  wohnung_id: string | null;
  name: string;
  datum: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz: string | null;
  user_id: string;
  dokument_id: string | null;
};

export async function fetchHaeuser() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Haeuser")
    .select('*, groesse');

  if (error) {
    console.error("Error fetching Haeuser:", error);
    return [];
  }

  return data as Haus[];
}

export async function fetchWohnungen() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Wohnungen")
    .select('*');

  if (error) {
    console.error("Error fetching Wohnungen:", error);
    return [];
  }

  return data as Wohnung[];
}

export async function fetchMieter() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Mieter")
    .select('*, Wohnungen(name, groesse, miete)');

  if (error) {
    console.error("Error fetching Mieter:", error);
    return [];
  }

  return data as Mieter[];
}

export async function fetchAufgaben() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Aufgaben")
    .select('*')
    .eq('ist_erledigt', false);

  if (error) {
    console.error("Error fetching Aufgaben:", error);
    return [];
  }

  return data as Aufgabe[];
}

export async function fetchFinanzen() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Finanzen")
    .select('*');

  if (error) {
    console.error("Error fetching Finanzen:", error);
    return [];
  }

  return data as Finanzen[];
}

export async function fetchNebenkosten(year?: string): Promise<Nebenkosten[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("Nebenkosten").select('*');

  // If year is provided, filter by date range that overlaps with that year
  if (year) {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    query = query
      .lte('startdatum', yearEnd)
      .gte('enddatum', yearStart);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching Nebenkosten:", error);
    return [];
  }

  return data as Nebenkosten[];
}

export async function getNebenkostenChartData(): Promise<NebenkostenChartData> {
  const supabase = createSupabaseServerClient();

  // First, get the most recent year with data
  const { data: latestYearData } = await supabase
    .from("Nebenkosten")
    .select("startdatum")
    .order("startdatum", { ascending: false })
    .limit(1)
    .single();

  if (!latestYearData?.startdatum) {
    console.log("No Nebenkosten data found");
    return { year: new Date().getFullYear(), data: [] };
  }

  // Extract the year from the most recent entry
  const latestYear = new Date(latestYearData.startdatum).getFullYear();
  const yearStart = `${latestYear}-01-01`;
  const yearEnd = `${latestYear}-12-31`;

  // Fetch only the data for the most recent year with data
  const { data, error } = await supabase
    .from("Nebenkosten")
    .select("nebenkostenart, betrag, startdatum, enddatum")
    .lte('startdatum', yearEnd)
    .gte('enddatum', yearStart)
    .order("startdatum", { ascending: false });

  if (error) {
    console.error("Error fetching Nebenkosten chart data:", error);
    return { year: latestYear, data: [] };
  }

  const categoryTotals: Record<string, number> = {};

  (data as Nebenkosten[] | null)?.forEach((record) => {
    const arten = record.nebenkostenart ?? [];
    const betraege = record.betrag ?? [];

    arten.forEach((art, index) => {
      if (!art) {
        return;
      }

      const amount = Number(betraege[index]);

      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }

      categoryTotals[art] = (categoryTotals[art] ?? 0) + amount;
    });
  });

  const formattedData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    year: latestYear,
    data: formattedData
  };
}

// getHausGesamtFlaeche function removed - replaced by get_nebenkosten_with_metrics database function
// This eliminates O(n) database calls and improves performance significantly

// fetchNebenkostenList function removed - replaced by fetchNebenkostenListOptimized in betriebskosten-actions.ts
// The optimized version uses get_nebenkosten_with_metrics database function to eliminate O(n) getHausGesamtFlaeche calls

// fetchNebenkostenDetailsById function removed - replaced by optimized database functions
// Use getAbrechnungModalDataAction or similar optimized functions instead

export async function fetchFinanzenByMonth() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Finanzen")
    .select('*')
    .order('datum', { ascending: true });

  if (error) {
    console.error("Error fetching Finanzen by month:", error);
    return [];
  }

  // Group by month
  const monthlyData = (data as Finanzen[]).reduce((acc, item) => {
    if (!item.datum) return acc;

    const date = new Date(item.datum);
    const monthYear = `${date.getFullYear()}-${date.getMonth() + 1}`;

    if (!acc[monthYear]) {
      acc[monthYear] = {
        month: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date),
        einnahmen: 0,
        ausgaben: 0
      };
    }

    if (item.ist_einnahmen) {
      acc[monthYear].einnahmen += Number(item.betrag);
    } else {
      acc[monthYear].ausgaben += Number(item.betrag);
    }

    return acc;
  }, {} as Record<string, { month: string; einnahmen: number; ausgaben: number }>);

  // Convert to array and sort by month
  return Object.values(monthlyData).slice(-12);
}

export async function getMietstatistik() {
  const wohnungen = await fetchWohnungen();
  const mieter = await fetchMieter();

  // Calculate occupancy data by month (last 12 months)
  const now = new Date();
  const monthsData = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    const month = new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date);
    const vermietet = mieter.filter(m => {
      const einzug = m.einzug ? new Date(m.einzug) : null;
      const auszug = m.auszug ? new Date(m.auszug) : null;

      return einzug && einzug <= date && (!auszug || auszug >= date);
    }).length;

    monthsData.push({
      month,
      vermietet,
      frei: wohnungen.length - vermietet
    });
  }

  return monthsData;
}

export async function getDashboardSummary() {
  const haeuser = await fetchHaeuser();
  const wohnungen = await fetchWohnungen();
  const mieter = await fetchMieter();
  const aufgaben = await fetchAufgaben();

  // Calculate monthly income
  const monatlicheEinnahmen = wohnungen.reduce((sum, wohnung) => sum + Number(wohnung.miete), 0);

  // Calculate yearly expenses from Nebenkosten - fetch only last year's data
  const currentYear = new Date().getFullYear();
  const lastYear = (currentYear - 1).toString();
  const nebenkosten = await fetchNebenkosten(lastYear);

  const jaehrlicheAusgaben = nebenkosten.reduce((sum, item) => {
    const betraegeSum = item.betrag ? item.betrag.reduce((a, b) => a + b, 0) : 0;
    const wasserkosten = item.wasserkosten || 0;
    return sum + betraegeSum + wasserkosten;
  }, 0);

  return {
    haeuserCount: haeuser.length,
    wohnungenCount: wohnungen.length,
    mieterCount: mieter.filter(m => !m.auszug || new Date(m.auszug) > new Date()).length,
    monatlicheEinnahmen,
    jaehrlicheAusgaben,
    offeneAufgabenCount: aufgaben.length
  };
}

// Make sure Profile type is defined if you use it, or adjust return types
// For example:
type Profile = {
  id: string;
  email?: string; // Email will come from auth.user primarily
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Consider Date type if you parse it
};

export async function fetchUserProfile(): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch profile data from 'profiles' table, excluding 'email'
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      stripe_price_id,
      stripe_current_period_end
    `)
    .eq('id', user.id)
    .single();

  const baseUserProfile: Profile = {
    id: user.id,
    email: user.email!, // Assert email is non-null from auth user, or handle if it can be null
    stripe_customer_id: null,
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    stripe_price_id: null,
    stripe_current_period_end: null,
  };

  if (profileError) {
    console.error('Error fetching user profile data from profiles table:', profileError.message);
    // If profile row doesn't exist (PGRST116) or other error, return base user info with null Stripe fields
    // This ensures the function always returns a consistently shaped object or null.
    if (profileError.code === 'PGRST116') {
      // Profile not found in 'profiles' table - this is expected for new users
    } else {
      console.error(`Unhandled error fetching profile data for user ${user.id}:`, profileError);
    }
    return baseUserProfile;
  }

  // If profileData is successfully fetched (not null and no error)
  // Combine email from auth.user with data from profiles table
  // profileData can be null if .single() finds no record but no actual error occurred (though typically PGRST116 error is set).
  const profileDataToSpread = profileData ? profileData : {};

  const finalProfile: Profile = {
    ...baseUserProfile, // Start with base (id, email, nullified stripe fields)
    ...profileDataToSpread, // Spread sanitized profile data
  };

  return finalProfile;
}

// Wasserzaehler type is defined earlier in the file (line ~132)

export type WasserzaehlerFormEntry = {
  mieter_id: string;
  mieter_name: string; // For display purposes in the form
  ablese_datum: string | null;
  zaehlerstand: number | string; // string to handle empty input
  verbrauch: number | string; // string to handle empty input
  // Optional: Add an existing_wasserzaehler_id if we need to update existing records
  // existing_wasserzaehler_id?: string | null;
};

export type WasserzaehlerFormData = {
  entries: WasserzaehlerFormEntry[];
  nebenkosten_id: string; // To associate the readings with a Nebenkosten entry
};

/**
 * Fetches Wasserzähler data for a specific house and year (backward compatibility)
 * @param hausId The ID of the house
 * @param year The year to fetch data for (e.g., '2024')
 * @returns Object containing mieter list and existing readings for the specified house and year
 */
export async function fetchWasserzaehlerByHausAndYear(
  hausId: string,
  year: string
): Promise<{ mieterList: Mieter[]; existingReadings: Wasserzaehler[] }> {
  const startdatum = `${year}-01-01`;
  const enddatum = `${year}-12-31`;
  return fetchWasserzaehlerByHausAndDateRange(hausId, startdatum, enddatum);
}

/**
 * Fetches Wasserzähler data for a specific house and date range
 * @param hausId The ID of the house
 * @param startdatum The start date of the billing period (YYYY-MM-DD)
 * @param enddatum The end date of the billing period (YYYY-MM-DD)
 * @returns Object containing mieter list and existing readings for the specified house and date range
 */
export async function fetchWasserzaehlerByHausAndDateRange(
  hausId: string,
  startdatum: string,
  enddatum: string
): Promise<{ mieterList: Mieter[]; existingReadings: Wasserzaehler[] }> {
  const supabase = createSupabaseServerClient();

  try {
    // 1. Fetch Wohnungen for the specified house
    const { data: wohnungenInHaus, error: wohnungenError } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('haus_id', hausId);

    if (wohnungenError || !wohnungenInHaus) {
      console.error(`Error fetching Wohnungen for Haus ID ${hausId}:`, wohnungenError);
      return { mieterList: [], existingReadings: [] };
    }

    if (wohnungenInHaus.length === 0) {
      return { mieterList: [], existingReadings: [] };
    }

    const wohnungIds = wohnungenInHaus.map(w => w.id);

    // 2. Fetch Mieter for these Wohnungen, filtered by date range
    const { data: relevantMieter, error: mieterError } = await supabase
      .from('Mieter')
      .select('*')
      .in('wohnung_id', wohnungIds)
      .lte('einzug', enddatum)
      .or(`auszug.gte.${startdatum},auszug.is.null`);

    if (mieterError) {
      console.error(`Error fetching Mieter for Wohnungen in Haus ID ${hausId}:`, mieterError);
      return { mieterList: [], existingReadings: [] };
    }

    if (!relevantMieter) {
      return { mieterList: [], existingReadings: [] };
    }

    // 3. Fetch water meter readings from new Zaehler + Zaehler_Ablesungen tables
    let existingReadings: Wasserzaehler[] = [];
    if (relevantMieter.length > 0) {
      // Get water meters for these apartments
      const { data: waterMeters, error: metersError } = await supabase
        .from('Zaehler')
        .select('id, wohnung_id')
        .in('wohnung_id', wohnungIds);

      if (metersError) {
        console.error('Error fetching Zaehler for Haus %s:', hausId, metersError);
      } else if (waterMeters && waterMeters.length > 0) {
        const meterIds = waterMeters.map(m => m.id);

        // Get readings for these meters in the date range
        const { data: readings, error: readingsError } = await supabase
          .from('Zaehler_Ablesungen')
          .select('*, zaehler_id')
          .in('zaehler_id', meterIds)
          .gte('ablese_datum', startdatum)
          .lte('ablese_datum', enddatum);

        if (readingsError) {
          console.error('Error fetching Zaehler_Ablesungen for Haus %s in date range %s to %s:', hausId, startdatum, enddatum, readingsError);
        } else if (readings) {
          // Transform new structure to legacy format for compatibility
          existingReadings = readings.map(reading => {
            const meter = waterMeters.find(m => m.id === reading.zaehler_id);
            const mieter = relevantMieter.find(m => m.wohnung_id === meter?.wohnung_id);

            return {
              id: reading.id,
              nebenkosten_id: '', // Not applicable in new structure
              mieter_id: mieter?.id || '',
              ablese_datum: reading.ablese_datum,
              zaehlerstand: reading.zaehlerstand || 0,
              verbrauch: reading.verbrauch || 0,
              user_id: reading.user_id
            };
          });
        }
      }
    }

    return {
      mieterList: relevantMieter,
      existingReadings
    };

  } catch (error) {
    console.error('Unexpected error in fetchWasserzaehlerByHausAndDateRange:', error);
    return { mieterList: [], existingReadings: [] };
  }
}

/**
 * Fetches Wasserzähler data for a specific Nebenkosten entry
 * @param nebenkostenId The ID of the Nebenkosten entry
 * @returns Object containing mieter list and existing readings for the specified Nebenkosten
 */
export async function fetchWasserzaehlerModalData(nebenkostenId: string): Promise<{ mieterList: Mieter[]; existingReadings: Wasserzaehler[] }> {
  const supabase = createSupabaseServerClient();

  try {
    // 1. Fetch Nebenkosten entry to get haeuser_id, startdatum, and enddatum
    const { data: nebenkostenEntry, error: nebenkostenError } = await supabase
      .from('Nebenkosten')
      .select('haeuser_id, startdatum, enddatum')
      .eq('id', nebenkostenId)
      .single();

    if (nebenkostenError || !nebenkostenEntry) {
      console.error(`Error fetching Nebenkosten entry for ID ${nebenkostenId}:`, nebenkostenError);
      throw new Error(`Nebenkosten entry with ID ${nebenkostenId} not found.`);
    }

    const { haeuser_id, startdatum, enddatum } = nebenkostenEntry;

    if (!haeuser_id || !startdatum || !enddatum) {
      console.error(`Nebenkosten entry ${nebenkostenId} is missing haeuser_id, startdatum, or enddatum.`);
      return { mieterList: [], existingReadings: [] };
    }

    // 2. Use the new function to get data by house and date range
    const { mieterList, existingReadings } = await fetchWasserzaehlerByHausAndDateRange(haeuser_id, startdatum, enddatum);

    // 3. Filter existingReadings to only include those for the current nebenkosten_id
    //    This maintains backward compatibility with the existing code
    const filteredReadings = existingReadings.filter(reading => reading.nebenkosten_id === nebenkostenId);

    return {
      mieterList,
      existingReadings: filteredReadings
    };

  } catch (error) {
    console.error('Unexpected error in fetchWasserzaehlerModalData:', error);
    return { mieterList: [], existingReadings: [] };
  }
}

// getAbrechnungModalData function removed - replaced by getAbrechnungModalDataAction in betriebskosten-actions.ts
// The optimized version uses get_abrechnung_modal_data database function for better performance

export async function getCurrentWohnungenCount(supabaseClient: any, userId: string): Promise<number> {
  if (!userId) {
    console.error("getCurrentWohnungenCount: userId is required");
    return 0;
  }

  try {
    const { count, error } = await supabaseClient
      .from("Wohnungen")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching Wohnungen count:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Unexpected error in getCurrentWohnungenCount:", error);
    return 0;
  }
}
