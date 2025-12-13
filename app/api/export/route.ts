export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import JSZip from 'jszip';
import Papa from 'papaparse';

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
    const supabase = await createSupabaseServerClient();
    const zip = new JSZip();
    let filesAdded = 0;

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

      // Ensure csvData is always an array of objects, even for headers of empty table.
      // Papa.unparse expects an array of objects or an object with fields and data.
      const csvData = data && data.length > 0 ? data : columns.length > 0 ? [Object.fromEntries(columns.map(col => [col, '']))] : [];
      const csv = Papa.unparse(csvData as unknown as Papa.UnparseObject<unknown>); // Cast to unknown first, then to Papa.UnparseObject

      return { tableName, csv };
    });

    const results = await Promise.all(exportPromises);

    for (const result of results) {
      if (result) {
        zip.file(`${result.tableName}.csv`, result.csv);
        filesAdded++;
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
