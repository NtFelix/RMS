'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { processDataToCsv, AllExportData } from '@/lib/export-data';
// We might need the specific types if we want to be more precise than 'any[]'
// import { Haus, Mieter, Finanzen, Wohnung, Nebenkosten, Aufgabe, Rechnung } from '@/lib/data-fetching';

export async function generateCsvExportDataAction(): Promise<{ [key: string]: string }> {
  const supabase = createSupabaseServerClient();

  const allData: AllExportData = {
    haeuser: [],
    mieter: [],
    finanzen: [],
    wohnungen: [],
    nebenkosten: [],
    aufgaben: [],
    rechnungen: [],
  };

  // Fetch Haeuser
  const { data: haeuserData, error: haeuserError } = await supabase.from('Haeuser').select('id, ort, name, strasse, groesse');
  if (haeuserError) console.error('Error fetching Haeuser for export:', haeuserError.message);
  allData.haeuser = haeuserData || [];

  // Fetch Mieter (excluding wohnung_id as it's a FK)
  const { data: mieterData, error: mieterError } = await supabase.from('Mieter').select('id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum');
  if (mieterError) console.error('Error fetching Mieter for export:', mieterError.message);
  allData.mieter = mieterData || [];

  // Fetch Finanzen (excluding wohnung_id)
  const { data: finanzenData, error: finanzenError } = await supabase.from('Finanzen').select('id, name, datum, betrag, ist_einnahmen, notiz');
  if (finanzenError) console.error('Error fetching Finanzen for export:', finanzenError.message);
  allData.finanzen = finanzenData || [];

  // Fetch Wohnungen (excluding haus_id)
  const { data: wohnungenData, error: wohnungenError } = await supabase.from('Wohnungen').select('id, groesse, name, miete');
  if (wohnungenError) console.error('Error fetching Wohnungen for export:', wohnungenError.message);
  allData.wohnungen = wohnungenData || [];

  // Fetch Nebenkosten (excluding haeuser_id)
  const { data: nebenkostenData, error: nebenkostenError } = await supabase.from('Nebenkosten').select('id, jahr, nebenkostenart, betrag, berechnungsart, wasserkosten');
  if (nebenkostenError) console.error('Error fetching Nebenkosten for export:', nebenkostenError.message);
  allData.nebenkosten = nebenkostenData || [];

  // Fetch Aufgaben
  const { data: aufgabenData, error: aufgabenError } = await supabase.from('Aufgaben').select('id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum');
  if (aufgabenError) console.error('Error fetching Aufgaben for export:', aufgabenError.message);
  allData.aufgaben = aufgabenData || [];

  // Fetch Rechnungen (excluding nebenkosten_id, mieter_id)
  const { data: rechnungenData, error: rechnungenError } = await supabase.from('Rechnungen').select('id, name, betrag');
  if (rechnungenError) console.error('Error fetching Rechnungen for export:', rechnungenError.message);
  allData.rechnungen = rechnungenData || [];

  // Process all fetched data into CSV strings
  return processDataToCsv(allData);
}
