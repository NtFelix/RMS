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

export type Nebenkosten = {
  id: string;
  jahr: string;
  nebenkostenart: string[] | null;
  betrag: number[] | null;
  berechnungsart: string[] | null;
  wasserkosten: number | null;
  haeuser_id: string;
  Haeuser?: { name: string } | null;
  user_id?: string; 
  Rechnungen?: RechnungSql[] | null; // Added for related Rechnungen
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

export async function fetchNebenkostenList() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Nebenkosten")
    .select('*, Haeuser(name)'); // Rechnungen(*) removed
    
  if (error) {
    console.error("Error fetching Nebenkosten list:", error);
    return [];
  }
  
  return data as Nebenkosten[];
}

export async function fetchNebenkostenDetailsById(id: string): Promise<Nebenkosten | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("Nebenkosten")
    .select('*, Haeuser(name), Rechnungen(*)')
    .eq('id', id)
    .single(); // Ensure only one record is fetched

  if (error) {
    console.error(`Error fetching Nebenkosten details for ID ${id}:`, error);
    return null;
  }

  if (!data) {
    console.warn(`No Nebenkosten found for ID ${id}`);
    return null;
  }

  return data as Nebenkosten;
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
