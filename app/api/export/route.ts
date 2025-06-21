import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import JSZip from 'jszip';
import Papa from 'papaparse';

// Define the tables and columns to export based on the LATEST provided schema.
// Exclude foreign keys (user_id, haus_id, wohnung_id, etc.) as requested.
const tablesToExport = {
  Aufgaben: ['id', 'ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'],
  Finanzen: ['id', 'name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'],
  Haeuser: ['id', 'ort', 'name', 'strasse', 'groesse'],
  Mieter: ['id', 'name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'],
  Nebenkosten: ['id', 'jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten', 'wasserverbrauch'],
  Rechnungen: ['id', 'name', 'betrag'],
  Wasserzaehler: ['id', 'ablese_datum', 'zaehlerstand', 'verbrauch'],
  Wohnungen: ['id', 'groesse', 'name', 'miete'],
  // Exporting limited, non-sensitive fields from profiles
  profiles: ['id', 'trial_starts_at', 'trial_ends_at'],
};

export async function GET() {
  try {
    const supabase = await createClient();
    const zip = new JSZip();
    let filesAdded = 0;

    for (const [tableName, columns] of Object.entries(tablesToExport)) {
      // Ensure columns is not empty before attempting to join
      if (columns.length === 0) {
        console.warn(`Skipping table ${tableName} as no columns are defined for export.`);
        continue;
      }
      const selectStatement = columns.join(',');
      const { data, error } = await supabase.from(tableName).select(selectStatement);

      if (error) {
        // Log detailed error and skip this table
        console.error(`Error fetching data for table ${tableName} (query: SELECT ${selectStatement}): ${error.message}. Code: ${error.code}. Details: ${error.details}. Hint: ${error.hint}`);
        continue;
      }

      if (data && data.length > 0) {
        const csv = Papa.unparse(data);
        zip.file(`${tableName}.csv`, csv);
        filesAdded++;
      } else {
        // Create an empty CSV with headers if no data
        const emptyDataWithHeaders = [Object.fromEntries(columns.map(col => [col, '']))];
        const csv = Papa.unparse(emptyDataWithHeaders);
        zip.file(`${tableName}.csv`, csv);
        filesAdded++; // Count as added, even if it's just headers + one empty row
      }
    }

    if (filesAdded === 0) {
      console.error('No data could be exported. All table queries might have failed or returned no data.');
      return new NextResponse(JSON.stringify({ error: 'Keine Daten exportiert.', details: 'Möglicherweise sind alle Tabellen leer oder es gab Fehler beim Datenabruf für alle Tabellen.' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="datenexport.zip"`,
        'Content-Type': 'application/zip',
      },
    });
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
