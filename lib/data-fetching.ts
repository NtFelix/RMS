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

export type DashboardSummary = {
  haeuserCount: number;
  wohnungenCount: number;
  mieterCount: number;
  monatlicheEinnahmen: number;
  monatlicheAusgaben: number;
  offeneAufgabenCount: number;
};


export async function fetchHaeuser(): Promise<Haus[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from("Haeuser")
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      
    if (error) throw error
    return (data || []) as Haus[]
  } catch (error) {
    console.error("Error fetching Haeuser:", error)
    return []
  }
}

export async function fetchWohnungen(): Promise<Wohnung[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from("Wohnungen")
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      
    if (error) throw error
    return (data || []) as Wohnung[]
  } catch (error) {
    console.error("Error fetching Wohnungen:", error)
    return []
  }
}

export async function fetchMieter(): Promise<Mieter[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from("Mieter")
      .select('*, Wohnungen(name, groesse, miete)')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      
    if (error) throw error
    return data || []
  } catch (error) {
    console.error("Error fetching Mieter:", error)
    return []
  }
}

export async function fetchAufgaben(): Promise<Aufgabe[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from("Aufgaben")
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('ist_erledigt', false)
    
    if (error) throw error
    return (data || []) as Aufgabe[]
  } catch (error) {
    console.error("Error fetching Aufgaben:", error)
    return []
  }
}

export async function fetchFinanzen(): Promise<Finanzen[]> {
  try {
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from("Finanzen")
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      
    if (error) throw error
    return (data || []) as Finanzen[]
  } catch (error) {
    console.error("Error fetching Finanzen:", error)
    return []
  }
}

export async function fetchFinanzenByMonth(): Promise<{
  month: number;
  year: number;
  einnahmen: number;
  ausgaben: number;
}[]> {
  try {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("Finanzen")
      .select('*')
      .order('datum', { ascending: true });
      
    if (error) throw error;
    
    const monthlyData = (data as Finanzen[]).reduce((acc, item) => {
      if (!item.datum) return acc;
      
      const date = new Date(item.datum);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month.toString().padStart(2, '0')}`;
      
      if (!acc[key]) {
        acc[key] = {
          month: month,
          year: year,
          einnahmen: 0,
          ausgaben: 0
        };
      }
      
      if (item.ist_einnahmen) {
        acc[key].einnahmen += item.betrag;
      } else {
        acc[key].ausgaben += item.betrag;
      }
      
      return acc;
    }, {} as Record<string, {
      month: number;
      year: number;
      einnahmen: number;
      ausgaben: number;
    }>);

    return Object.values(monthlyData).sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1);
      const dateB = new Date(b.year, b.month - 1);
      return dateA.getTime() - dateB.getTime();
    });
  } catch (error) {
    console.error("Error fetching Finanzen by month:", error);
    return [];
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
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
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return {
      haeuserCount: 0,
      wohnungenCount: 0,
      mieterCount: 0,
      monatlicheEinnahmen: 0,
      monatlicheAusgaben: 0,
      offeneAufgabenCount: 0
    };
  }
}
