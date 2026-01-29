export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Define the tables and columns to export based on the LATEST provided schema.
// Exclude ALL ID columns (primary and foreign keys) as requested.
const tablesToExport = {
  Aufgaben: ['ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'],
  Finanzen: ['name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'],
  Haeuser: ['ort', 'name', 'strasse', 'groesse'],
  Mieter: ['name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'],
  Nebenkosten: ['jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten', 'wasserverbrauch'],
  Rechnungen: ['name', 'betrag'],
  Wasserzaehler: ['ablese_datum', 'zaehlerstand', 'verbrauch'],
  Wohnungen: ['groesse', 'name', 'miete'],
  // profiles table removed from export as requested due to sensitive data.
};

export async function GET() {
  try {
    const supabase = await createClient();

    const exportPromises = Object.entries(tablesToExport).map(async ([tableName, columns]) => {
      if (columns.length === 0) {
        console.warn(`Skipping table ${tableName} as no columns are defined for export.`);
        return null;
      }
      const selectStatement = columns.join(',');
      const { data, error } = await supabase.from(tableName).select(selectStatement);

      if (error) {
        console.error(`Error fetching data for table ${tableName} (query: SELECT ${selectStatement}): ${error.message}. Code: ${error.code}. Details: ${error.details}. Hint: ${error.hint}`);
        return null;
      }

      // Ensure data is always an array of objects, even for empty table.
      const csvData = data && data.length > 0 ? data : columns.length > 0 ? [Object.fromEntries(columns.map(col => [col, '']))] : [];

      return { tableName, data: csvData };
    });

    const results = await Promise.all(exportPromises);
    const exportData: Record<string, any[]> = {};

    for (const result of results) {
      if (result) {
        exportData[result.tableName] = result.data;
      }
    }

    if (Object.keys(exportData).length === 0) {
      console.error('No data could be exported. All table queries might have failed or returned no data.');
      return new NextResponse(JSON.stringify({ error: 'Keine Daten exportiert.', details: 'Möglicherweise sind alle Tabellen leer oder es gab Fehler beim Datenabruf für alle Tabellen.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Offload ZIP generation to Worker
    const { generateZIP } = await import('@/lib/worker-client');
    return await generateZIP(exportData, 'datenexport.zip');
  } catch (error) {
    console.error('Error during data export process:', error);
    return new NextResponse(JSON.stringify({ error: 'Fehler beim Exportieren der Daten.', details: (error as Error).message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
