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
  wasserverbrauch?: number | null; // Added for water consumption
  haeuser_id: string;
  Haeuser?: { name: string } | null;
  user_id?: string; 
  Rechnungen?: RechnungSql[] | null;
  gesamtFlaeche?: number; // Added for total area
  anzahlWohnungen?: number; // Number of apartments
  anzahlMieter?: number; // Number of tenants
};

// Added as per subtask
export interface Rechnung {
  id:string;
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

export type Finanzen = {
  id: string;
  wohnung_id: string | null;
  name: string;
  datum: string | null;
  betrag: number;
  ist_einnahmen: boolean;
  notiz: string | null;
  user_id: string;
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

export async function getHausGesamtFlaeche(
  hausId: string, 
  startdatum?: string, 
  enddatum?: string
): Promise<{
  gesamtFlaeche: number;
  anzahlWohnungen: number;
  anzahlMieter: number;
}> {
  if (!hausId) {
    console.error('Invalid hausId provided to getHausGesamtFlaeche:', hausId);
    return { gesamtFlaeche: 0, anzahlWohnungen: 0, anzahlMieter: 0 };
  }

  const supabase = createSupabaseServerClient();
  
  try {
    // Fetch the specific house to check for a 'groesse' override
    const { data: hausData, error: hausError } = await supabase
      .from('Haeuser')
      .select('groesse')
      .eq('id', hausId)
      .single();

    if (hausError) {
      // Log the error but proceed, as we can still calculate from Wohnungen
      console.warn(`Error fetching house data for ID ${hausId} in getHausGesamtFlaeche:`, hausError.message);
    }

    let gesamtFlaecheCalc: number;
    let anzahlWohnungen = 0;
    let wohnungen: { id: string; groesse: number }[] = []; // Initialize wohnungen

    if (hausData && typeof hausData.groesse === 'number') {
      gesamtFlaecheCalc = hausData.groesse;
      // Fetch wohnungen anyway to get anzahlWohnungen and for mieter calculation
      const { data: wohnungenData, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('id, groesse') // Keep groesse for potential individual calculations if needed elsewhere
        .eq('haus_id', hausId);

      if (wohnungenError) {
        console.error('Error fetching apartments even when house.groesse is set:', wohnungenError);
        // Depending on requirements, you might throw or continue with anzahlWohnungen = 0
      } else if (wohnungenData) {
        wohnungen = wohnungenData;
        anzahlWohnungen = wohnungenData.length;
      }
    } else {
      // Original logic: calculate gesamtFlaeche from apartments
      const { data: wohnungenData, error: wohnungenError } = await supabase
        .from('Wohnungen')
        .select('id, groesse')
        .eq('haus_id', hausId);

      if (wohnungenError) {
        console.error('Error fetching apartments:', wohnungenError);
        throw wohnungenError; // Or handle more gracefully
      }

      if (!wohnungenData || wohnungenData.length === 0) {
        console.warn(`No apartments found for haus_id: ${hausId}`);
        // Return early if no apartments and no override groesse
        return { gesamtFlaeche: 0, anzahlWohnungen: 0, anzahlMieter: 0 };
      }
      wohnungen = wohnungenData;
      gesamtFlaecheCalc = wohnungen.reduce((sum, wohnung) => sum + (wohnung.groesse || 0), 0);
      anzahlWohnungen = wohnungen.length;
    }

    // Get tenant data for the specific year
    let anzahlMieter = 0;
    // Ensure wohnungen is populated before trying to map over it for tenant fetching
    if (wohnungen.length > 0) {
      try {
        // Get all tenants for the apartments in this house
        const { data: mieter, error: mieterError } = await supabase
          .from('Mieter')
          .select('id, wohnung_id, einzug, auszug')
          .in('wohnung_id', wohnungen.map(w => w.id).filter(Boolean) as string[]);

        if (mieterError) {
          console.warn('Error fetching tenant data, will continue without it:', mieterError);
        } else if (mieter && mieter.length > 0) {
          if (startdatum && enddatum) {
            // If date range is provided, filter tenants who lived there during that period
            anzahlMieter = mieter.filter(tenant => {
              const moveIn = tenant.einzug || '1900-01-01';
              const moveOut = tenant.auszug || '9999-12-31'; // If no move-out date, assume still living there (using far future date)

              // Check if the tenant's stay overlaps with the billing period
              // If auszug is null, moveOut is set to '9999-12-31', so moveOut >= startdatum will always be true
              return moveIn <= enddatum && moveOut >= startdatum;
            }).length;
          } else {
            // If no date range is provided, just count all tenants
            anzahlMieter = mieter.length;
          }
        }
      } catch (error) {
        console.warn('Unexpected error when fetching tenant data, will continue without it:', error);
      }
    } else if (gesamtFlaecheCalc > 0) {
      // This case means Haeuser.groesse was used, but no apartments were found (or fetched)
      // anzahlWohnungen would be 0 (or the count from the separate fetch if that succeeded)
      // anzahlMieter will remain 0 as there are no Wohnungen to link Mieter to.
      console.warn(`Haus ${hausId} uses Haeuser.groesse, but no associated Wohnungen found for tenant calculation.`);
    }
    
    return { 
      gesamtFlaeche: gesamtFlaecheCalc,
      anzahlWohnungen,
      anzahlMieter
    };
  } catch (error) {
    console.error('Unexpected error in getHausGesamtFlaeche:', error);
    return { gesamtFlaeche: 0, anzahlWohnungen: 0, anzahlMieter: 0 };
  }
}

export async function fetchNebenkostenList(): Promise<Nebenkosten[]> {
  const supabase = createSupabaseServerClient();
  
  try {
    // First, get the Nebenkosten data with house information
    const { data, error } = await supabase
      .from("Nebenkosten")
      .select('*, Haeuser!left(name)'); // Changed to left join to handle missing house data
      
    if (error) {
      console.error("Error fetching Nebenkosten list:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }
    
    // Process each entry
    const nebendkostenWithArea = [];
    
    for (const item of data) {
      // --- Start of added console logs ---
      console.log(`Processing Nebenkosten ID: ${item.id}, Zeitraum: ${item.startdatum} bis ${item.enddatum}`);
      console.log(`  Directly from DB - wasskerkosten: ${item.wasserkosten}, wasserverbrauch: ${item.wasserverbrauch}`);

      if (item.haeuser_id === 'b203ef5c-0de4-4063-b2ed-bb981a13f032') {
        console.log(`  ^^^ Problematic haus_id detected: ${item.haeuser_id} ^^^`);
      }
      // --- End of added console logs ---

      try {
        // Skip if no house ID is available
        if (!item.haeuser_id) {
          console.warn('Skipping Nebenkosten entry with missing haus_id:', item.id);
          continue;
        }
        
        const { gesamtFlaeche, anzahlWohnungen, anzahlMieter } = await getHausGesamtFlaeche(item.haeuser_id, item.startdatum, item.enddatum);
        
        // --- Added console log for final composed item ---
        const finalItem = {
          ...item,
          gesamtFlaeche,
          anzahlWohnungen,
          anzahlMieter,
          // Ensure Haeuser is always an object to prevent undefined errors
          Haeuser: item.Haeuser || { name: 'Unbekanntes Haus' }
        };
        console.log(`  Final composed item - wasskerkosten: ${finalItem.wasserkosten}, wasserverbrauch: ${finalItem.wasserverbrauch}`);
        // --- End of added console log ---

        nebendkostenWithArea.push(finalItem);
      } catch (error) {
        console.error(`Error processing Nebenkosten entry ${item.id}:`, error);
        // Continue with other entries even if one fails
      }
    }
    
    // Sort the results by start date in descending order (newest first)
    const sortedNebenkosten = nebendkostenWithArea.sort((a, b) => {
      const dateA = new Date(a.startdatum || '1900-01-01');
      const dateB = new Date(b.startdatum || '1900-01-01');
      return dateB.getTime() - dateA.getTime(); // Sort in descending order (newest first)
    });
    
    return sortedNebenkosten as Nebenkosten[];
  } catch (error) {
    console.error('Unexpected error in fetchNebenkostenList:', error);
    return [];
  }
}

export async function fetchNebenkostenDetailsById(id: string): Promise<Nebenkosten | null> {
  if (!id) {
    console.error('No ID provided to fetchNebenkostenDetailsById');
    return null;
  }

  const supabase = createSupabaseServerClient();
  
  try {
    const { data, error } = await supabase
      .from("Nebenkosten")
      .select('*, Haeuser!left(name), Rechnungen(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching Nebenkosten details for ID ${id}:`, error);
      return null;
    }

    if (!data) {
      console.warn(`No Nebenkosten found for ID ${id}`);
      return null;
    }

    // Skip if no house ID is available
    if (!data.haeuser_id) {
      console.warn(`Nebenkosten entry ${id} has no associated house`);
      return {
        ...data,
        Haeuser: { name: 'Unbekanntes Haus' },
        gesamtFlaeche: 0,
        anzahlWohnungen: 0,
        anzahlMieter: 0
      } as Nebenkosten;
    }

    // Get house metrics
    const { gesamtFlaeche, anzahlWohnungen, anzahlMieter } = await getHausGesamtFlaeche(data.haeuser_id, data.startdatum, data.enddatum);
    
    return {
      ...data,
      Haeuser: data.Haeuser || { name: 'Unbekanntes Haus' },
      gesamtFlaeche,
      anzahlWohnungen,
      anzahlMieter
    } as Nebenkosten;
  } catch (error) {
    console.error(`Unexpected error in fetchNebenkostenDetailsById for ID ${id}:`, error);
    return null;
  }
}

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
    console.log("No user logged in for fetchUserProfile");
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
        console.log(`Profile not found in 'profiles' for user ${user.id}. Returning auth info only.`);
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
export type Wasserzaehler = {
  id: string; // uuid
  user_id: string; // uuid, default auth.uid()
  mieter_id: string; // uuid
  ablese_datum: string | null; // date
  zaehlerstand: number; // numeric
  verbrauch: number; // numeric
  nebenkosten_id: string; // uuid // Corrected property name to match DB
};

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
      console.log(`No Wohnungen found for Haus ID ${hausId}.`);
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

    // 3. Fetch Wasserzaehler readings for these mieters in the specified date range
    let existingReadings: Wasserzaehler[] = [];
    if (relevantMieter.length > 0) {
      const mieterIds = relevantMieter.map(m => m.id);
      const startDate = new Date(startdatum);
      const endDate = new Date(enddatum);

      const { data: readings, error: readingsError } = await supabase
        .from('Wasserzaehler')
        .select('*')
        .in('mieter_id', mieterIds)
        .gte('ablese_datum', startDate.toISOString())
        .lte('ablese_datum', endDate.toISOString());

      if (readingsError) {
        console.error(`Error fetching Wasserzaehler readings for Haus ${hausId} in date range ${startdatum} to ${enddatum}:`, readingsError);
      } else if (readings) {
        existingReadings = readings;
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

export async function getAbrechnungModalData(nebenkostenId: string): Promise<{
  nebenkostenItem: Nebenkosten | null;
  tenants: Mieter[];
  wasserzaehlerReadings: Wasserzaehler[];
} | null> {
  if (!nebenkostenId) {
    console.error("getAbrechnungModalData: nebenkostenId is required");
    return null;
  }

  const nebenkostenItem = await fetchNebenkostenDetailsById(nebenkostenId);
  if (!nebenkostenItem) {
    // If nebenkostenItem itself is null, we probably can't proceed meaningfully.
    return null;
  }

  // fetchWasserzaehlerModalData expects nebenkostenId and returns { mieterList, existingReadings }
  // We need to ensure that the Mieter[] from mieterList and Wasserzaehler[] from existingReadings are correctly typed.
  const wasserzaehlerData = await fetchWasserzaehlerModalData(nebenkostenId);

  return {
    nebenkostenItem,
    tenants: wasserzaehlerData.mieterList,
    wasserzaehlerReadings: wasserzaehlerData.existingReadings,
  };
}

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
