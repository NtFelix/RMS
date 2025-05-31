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
};

export type Mieter = {
  id: string;
  wohnung_id: string | null;
  name: string;
  einzug: string | null;
  auszug: string | null;
  email: string | null;
  telefonnummer: string | null;
  notiz: string | null;
  nebenkosten: number[] | null;
  nebenkosten_datum: string[] | null;
  user_id: string;
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
  jahr: string;
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
    .select('*');
    
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
  
  return data;
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

export async function getHausGesamtFlaeche(hausId: string, jahr?: string): Promise<{
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
    // First, get the basic apartment data
    const { data: wohnungen, error: wohnungenError } = await supabase
      .from('Wohnungen')
      .select('id, groesse')
      .eq('haus_id', hausId);

    if (wohnungenError) {
      console.error('Error fetching apartments:', wohnungenError);
      throw wohnungenError;
    }

    // If no apartments found, return zeros
    if (!wohnungen || wohnungen.length === 0) {
      console.warn(`No apartments found for haus_id: ${hausId}`);
      return { gesamtFlaeche: 0, anzahlWohnungen: 0, anzahlMieter: 0 };
    }

    // Calculate total area
    const totalArea = wohnungen.reduce((sum, wohnung) => sum + (wohnung.groesse || 0), 0);
    const anzahlWohnungen = wohnungen.length;

    // Get tenant data for the specific year
    let anzahlMieter = 0;
    try {
      // Get all tenants for the apartments in this house
      const { data: mieter, error: mieterError } = await supabase
        .from('Mieter')
        .select('id, wohnung_id, einzug, auszug')
        .in('wohnung_id', wohnungen.map(w => w.id).filter(Boolean) as string[]);

      if (mieterError) {
        console.warn('Error fetching tenant data, will continue without it:', mieterError);
      } else if (mieter && mieter.length > 0) {
        if (jahr) {
          // If a year is provided, filter tenants who lived there during that year
          const yearNum = parseInt(jahr);
          const yearStart = new Date(yearNum, 0, 1).toISOString().split('T')[0];
          const yearEnd = new Date(yearNum, 11, 31).toISOString().split('T')[0];
          
          anzahlMieter = mieter.filter(tenant => {
            const moveIn = tenant.einzug || '';
            const moveOut = tenant.auszug || '9999-12-31'; // If no move-out date, assume still living there
            
            // Check if the tenant's stay overlaps with the target year
            return (
              (moveIn <= yearEnd) && 
              (moveOut >= yearStart || !tenant.auszug)
            );
          }).length;
        } else {
          // If no year is provided, just count all tenants
          anzahlMieter = mieter.length;
        }
      }
    } catch (error) {
      console.warn('Unexpected error when fetching tenant data, will continue without it:', error);
    }
    
    return { 
      gesamtFlaeche: totalArea,
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
      try {
        // Skip if no house ID is available
        if (!item.haeuser_id) {
          console.warn('Skipping Nebenkosten entry with missing haus_id:', item.id);
          continue;
        }
        
        const { gesamtFlaeche, anzahlWohnungen, anzahlMieter } = await getHausGesamtFlaeche(item.haeuser_id, item.jahr);
        
        nebendkostenWithArea.push({
          ...item,
          gesamtFlaeche,
          anzahlWohnungen,
          anzahlMieter,
          // Ensure Haeuser is always an object to prevent undefined errors
          Haeuser: item.Haeuser || { name: 'Unbekanntes Haus' }
        });
      } catch (error) {
        console.error(`Error processing Nebenkosten entry ${item.id}:`, error);
        // Continue with other entries even if one fails
      }
    }
    
    return nebendkostenWithArea as Nebenkosten[];
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
    const { gesamtFlaeche, anzahlWohnungen, anzahlMieter } = await getHausGesamtFlaeche(data.haeuser_id, data.jahr || undefined);
    
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
  const finanzen = await fetchFinanzen();
  
  // Calculate monthly income
  const monatlicheEinnahmen = wohnungen.reduce((sum, wohnung) => sum + Number(wohnung.miete), 0);
  
  // Calculate monthly expenses (average of last 3 months)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const recentAusgaben = finanzen
    .filter(f => !f.ist_einnahmen && f.datum && new Date(f.datum) >= threeMonthsAgo)
    .reduce((sum, item) => sum + Number(item.betrag), 0);
  
  const monatlicheAusgaben = recentAusgaben / 3; // Average over 3 months
  
  return {
    haeuserCount: haeuser.length,
    wohnungenCount: wohnungen.length,
    mieterCount: mieter.filter(m => !m.auszug || new Date(m.auszug) > new Date()).length,
    monatlicheEinnahmen,
    monatlicheAusgaben,
    offeneAufgabenCount: aufgaben.length
  };
}
