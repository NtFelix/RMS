export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ALLOWED_EXPORT_SCHEMA, ExportConfig } from '@/lib/export-config';

async function processExport(config: Record<string, string[]>) {
  try {
    const supabase = await createClient();

    const exportPromises = Object.entries(config).map(async ([tableName, columns]) => {
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

export async function GET() {
  return processExport(ALLOWED_EXPORT_SCHEMA);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, selectedColumns } = body as ExportConfig;

    if (!selectedColumns || typeof selectedColumns !== 'object') {
      return new NextResponse(JSON.stringify({ error: 'Ungültige Export-Konfiguration' }), { status: 400 });
    }

    const finalConfig: Record<string, string[]> = {};

    for (const [table, columns] of Object.entries(selectedColumns)) {
      if (ALLOWED_EXPORT_SCHEMA[table]) {
        // Filter out any columns that are not in the allowed schema
        const validColumns = columns.filter(col => ALLOWED_EXPORT_SCHEMA[table].includes(col));
        if (validColumns.length > 0) {
          finalConfig[table] = validColumns;
        }
      }
    }

    return processExport(finalConfig);
  } catch (error) {
    console.error('Error parsing POST export request:', error);
    return new NextResponse(JSON.stringify({ error: 'Ungültige Anfrage' }), { status: 400 });
  }
}
