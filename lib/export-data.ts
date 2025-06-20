import { createSupabaseServerClient } from './supabase-server';
import { Haus, Mieter, Finanzen, Wohnung, Nebenkosten, Aufgabe, Rechnung } from './data-fetching'; // Assuming types are exported from here

// Helper function to convert an array of objects to CSV
function convertToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) {
    return '';
  }
  const header = columns.join(',') + '\n';
  const rows = data.map(row => {
    return columns.map(col => {
      let cell = row[col];
      if (cell === null || cell === undefined) {
        cell = '';
      } else if (Array.isArray(cell)) {
        // Convert array to a string representation, e.g., "item1;item2"
        cell = `"${cell.join(';')}"`;
      } else if (typeof cell === 'string' && cell.includes(',')) {
        // Enclose string with comma in double quotes
        cell = `"${cell}"`;
      }
      return cell;
    }).join(',');
  }).join('\n');
  return header + rows;
}

export async function exportDataAsCsv(): Promise<{ [key: string]: string }> {
  const supabase = createSupabaseServerClient();
  const csvData: { [key: string]: string } = {};

  // Fetch and process Haeuser
  const { data: haeuserData, error: haeuserError } = await supabase.from('Haeuser').select('id, ort, name, strasse, groesse');
  if (haeuserError) console.error('Error fetching Haeuser:', haeuserError);
  if (haeuserData) {
    const columns = ['id', 'ort', 'name', 'strasse', 'groesse'];
    csvData['haeuser.csv'] = convertToCSV(haeuserData, columns);
  }

  // Fetch and process Mieter
  // Excludes: wohnung_id (FK)
  const { data: mieterData, error: mieterError } = await supabase.from('Mieter').select('id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, nebenkosten_datum');
  if (mieterError) console.error('Error fetching Mieter:', mieterError);
  if (mieterData) {
    const columns = ['id', 'name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'];
    csvData['mieter.csv'] = convertToCSV(mieterData, columns);
  }

  // Fetch and process Finanzen
  // Excludes: wohnung_id (FK)
  const { data: finanzenData, error: finanzenError } = await supabase.from('Finanzen').select('id, name, datum, betrag, ist_einnahmen, notiz');
  if (finanzenError) console.error('Error fetching Finanzen:', finanzenError);
  if (finanzenData) {
    const columns = ['id', 'name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'];
    csvData['finanzen.csv'] = convertToCSV(finanzenData, columns);
  }

  // Fetch and process Wohnungen
  // Excludes: haus_id (FK)
  const { data: wohnungenData, error: wohnungenError } = await supabase.from('Wohnungen').select('id, groesse, name, miete');
  if (wohnungenError) console.error('Error fetching Wohnungen:', wohnungenError);
  if (wohnungenData) {
    const columns = ['id', 'groesse', 'name', 'miete'];
    csvData['wohnungen.csv'] = convertToCSV(wohnungenData, columns);
  }

  // Fetch and process Nebenkosten
  // Excludes: haeuser_id (FK)
  const { data: nebenkostenData, error: nebenkostenError } = await supabase.from('Nebenkosten').select('id, jahr, nebenkostenart, betrag, berechnungsart, wasserkosten');
  if (nebenkostenError) console.error('Error fetching Nebenkosten:', nebenkostenError);
  if (nebenkostenData) {
    const columns = ['id', 'jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten'];
    csvData['nebenkosten.csv'] = convertToCSV(nebenkostenData, columns);
  }

  // Fetch and process Aufgaben
  // Excludes: user_id (FK) - user_id is typically auth.uid() and might not be desired in data export or it's implicit.
  // Consider if erstellungsdatum and aenderungsdatum are needed.
  const { data: aufgabenData, error: aufgabenError } = await supabase.from('Aufgaben').select('id, ist_erledigt, name, beschreibung, erstellungsdatum, aenderungsdatum');
  if (aufgabenError) console.error('Error fetching Aufgaben:', aufgabenError);
  if (aufgabenData) {
    const columns = ['id', 'ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'];
    csvData['aufgaben.csv'] = convertToCSV(aufgabenData, columns);
  }

  // Fetch and process Rechnungen
  // Excludes: nebenkosten_id (FK), mieter_id (FK)
  const { data: rechnungenData, error: rechnungenError } = await supabase.from('Rechnungen').select('id, name, betrag');
  if (rechnungenError) console.error('Error fetching Rechnungen:', rechnungenError);
  if (rechnungenData) {
    const columns = ['id', 'name', 'betrag'];
    csvData['rechnungen.csv'] = convertToCSV(rechnungenData, columns);
  }

  // Note: Wasserzaehler table seems to only have id and user_id based on datenbankstruktur.md
  // If it's intended to be exported, decide which fields are relevant.
  // For now, skipping Wasserzaehler as it lacks non-FK data fields besides 'id'.

  return csvData;
}
