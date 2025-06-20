'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { processDataToCsv, AllExportData } from '@/lib/export-data';
// Import specific types to ensure correctness, matching those in AllExportData
import type { Haus, Mieter, Finanzen, Wohnung, Nebenkosten, Aufgabe, Rechnung } from '@/lib/data-fetching';

export async function generateCsvExportDataAction(): Promise<{ [key: string]: string }> {
  const supabase = createSupabaseServerClient();

  // Initialize with correct types
  const allData: AllExportData = {
    haeuser: [] as Haus[],
    mieter: [] as Mieter[],
    finanzen: [] as Finanzen[],
    wohnungen: [] as Wohnung[],
    nebenkosten: [] as Nebenkosten[],
    aufgaben: [] as Aufgabe[],
    rechnungen: [] as Rechnung[],
  };

  // Fetch Haeuser
  // Required: id, name, user_id. CSV: id, ort, name, strasse, groesse.
  // New select: id, name, user_id, ort, strasse, groesse
  const { data: haeuserData, error: haeuserError } = await supabase.from('Haeuser').select('id, name, user_id, ort, strasse, groesse');
  if (haeuserError) console.error('Error fetching Haeuser for export:', haeuserError.message);
  allData.haeuser = (haeuserData || []) as Haus[];


  // Fetch Mieter
  // Required: id, name, user_id. CSV: id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum.
  // New select: id, name, user_id, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum, wohnung_id
  const { data: mieterData, error: mieterError } = await supabase.from('Mieter').select('id, name, user_id, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum, wohnung_id');
  if (mieterError) console.error('Error fetching Mieter for export:', mieterError.message);
  allData.mieter = (mieterData || []) as Mieter[];

  // Fetch Finanzen
  // Required: id, name, betrag, ist_einnahmen, user_id. CSV: id, name, datum, betrag, ist_einnahmen, notiz.
  // New select: id, name, betrag, ist_einnahmen, user_id, datum, notiz, wohnung_id
  const { data: finanzenData, error: finanzenError } = await supabase.from('Finanzen').select('id, name, betrag, ist_einnahmen, user_id, datum, notiz, wohnung_id');
  if (finanzenError) console.error('Error fetching Finanzen for export:', finanzenError.message);
  allData.finanzen = (finanzenData || []) as Finanzen[];

  // Fetch Wohnungen
  // Required: id, groesse, name, miete, user_id. CSV: id, groesse, name, miete.
  // New select: id, groesse, name, miete, user_id, haus_id
  const { data: wohnungenData, error: wohnungenError } = await supabase.from('Wohnungen').select('id, groesse, name, miete, user_id, haus_id');
  if (wohnungenError) console.error('Error fetching Wohnungen for export:', wohnungenError.message);
  allData.wohnungen = (wohnungenData || []) as Wohnung[];

  // Fetch Nebenkosten
  // Required: id, jahr, haeuser_id. CSV: id, jahr, nebenkostenart, betrag, berechnungsart, wasserkosten.
  // New select: id, jahr, haeuser_id, nebenkostenart, betrag, berechnungsart, wasserkosten, user_id, wasserverbrauch
  const { data: nebenkostenData, error: nebenkostenError } = await supabase.from('Nebenkosten').select('id, jahr, haeuser_id, nebenkostenart, betrag, berechnungsart, wasserkosten, user_id, wasserverbrauch');
  if (nebenkostenError) console.error('Error fetching Nebenkosten for export:', nebenkostenError.message);
  allData.nebenkosten = (nebenkostenData || []) as Nebenkosten[];

  // Fetch Aufgaben
  // Required: id, user_id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum. CSV: id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum.
  // New select: id, user_id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum
  const { data: aufgabenData, error: aufgabenError } = await supabase.from('Aufgaben').select('id, user_id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum');
  if (aufgabenError) console.error('Error fetching Aufgaben for export:', aufgabenError.message);
  allData.aufgaben = (aufgabenData || []) as Aufgabe[];

  // Fetch Rechnungen
  // Required: id, user_id, name. CSV: id, name, betrag.
  // New select: id, user_id, name, betrag, nebenkosten_id, mieter_id
  const { data: rechnungenData, error: rechnungenError } = await supabase.from('Rechnungen').select('id, user_id, name, betrag, nebenkosten_id, mieter_id');
  if (rechnungenError) console.error('Error fetching Rechnungen for export:', rechnungenError.message);
  allData.rechnungen = (rechnungenData || []) as Rechnung[];

  // Process all fetched data into CSV strings
  return processDataToCsv(allData);
}
