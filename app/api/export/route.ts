export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';

// Define the tables and columns to export based on the LATEST provided schema.
// Exclude ALL ID columns (primary and foreign keys) as requested.
const tablesToExport = {
  Aufgaben: ['ist_erledigt', 'name', 'beschreibung', 'erstellungsdatum', 'aenderungsdatum'],
  Finanzen: ['name', 'datum', 'betrag', 'ist_einnahmen', 'notiz'],
  Haeuser: ['ort', 'name', 'strasse', 'groesse'],
  Mieter: ['name', 'einzug', 'auszug', 'email', 'telefonnummer', 'notiz', 'nebenkosten', 'nebenkosten_datum'],
  Nebenkosten: ['jahr', 'nebenkostenart', 'betrag', 'berechnungsart', 'wasserkosten', 'wasserverbrauch'],
  Rechnungen: ['name', 'betrag'],
  Zaehler_Ablesungen: ['ablese_datum', 'zaehlerstand', 'verbrauch', 'kommentar'],
  Wohnungen: ['groesse', 'name', 'miete'],
  // profiles table removed from export as requested due to sensitive data.
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { getAccessibleHaeuserIds, getAccessibleWohnungIds } = await import('@/lib/object-scope');
    const accessibleHaeuserIds = await getAccessibleHaeuserIds();
    const accessibleWohnungIds = await getAccessibleWohnungIds();

    const exportData: Record<string, any[]> = {};

    if (accessibleHaeuserIds !== null && accessibleHaeuserIds.length === 0) {
      // Return empty export immediately if the user has access to 0 houses
      Object.entries(tablesToExport).forEach(([tableName, columns]) => {
        exportData[tableName] = columns.length > 0 ? [Object.fromEntries(columns.map(col => [col, '']))] : [];
      });
    } else {
      // Fetch accessible Zaehler and Mieter IDs for nested filters
      let accessibleZaehlerIds: string[] | null = null;
      let accessibleMieterIds: string[] | null = null;

      if (accessibleWohnungIds !== null) {
        const { data: zaehlers } = await supabase
          .from('Zaehler')
          .select('id')
          .in('wohnung_id', accessibleWohnungIds);
        accessibleZaehlerIds = zaehlers ? zaehlers.map((z: any) => z.id) : [];

        const { data: mieters } = await supabase
          .from('Mieter')
          .select('id')
          .in('wohnung_id', accessibleWohnungIds);
        accessibleMieterIds = mieters ? mieters.map((m: any) => m.id) : [];
      }

      const exportPromises = Object.entries(tablesToExport).map(async ([tableName, columns]) => {
        if (columns.length === 0) {
          console.warn(`Skipping table ${tableName} as no columns are defined for export.`);
          return null;
        }
        const selectStatement = columns.join(',');
        let query = supabase.from(tableName).select(selectStatement);

        // Apply filters based on table columns and active scope
        if (accessibleHaeuserIds !== null) {
          if (tableName === 'Haeuser') {
            query = query.in('id', accessibleHaeuserIds);
          } else if (tableName === 'Wohnungen') {
            query = query.in('haus_id', accessibleHaeuserIds);
          } else if (tableName === 'Nebenkosten') {
            query = query.in('haeuser_id', accessibleHaeuserIds);
          }
        }

        if (accessibleWohnungIds !== null) {
          if (tableName === 'Mieter') {
            query = query.in('wohnung_id', accessibleWohnungIds);
          } else if (tableName === 'Finanzen') {
            query = query.in('wohnung_id', accessibleWohnungIds);
          }
        }

        if (accessibleZaehlerIds !== null && tableName === 'Zaehler_Ablesungen') {
          query = query.in('zaehler_id', accessibleZaehlerIds);
        }

        if (accessibleMieterIds !== null && tableName === 'Rechnungen') {
          query = query.in('mieter_id', accessibleMieterIds);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error fetching data for table ${tableName} (query: SELECT ${selectStatement}): ${error.message}. Code: ${error.code}. Details: ${error.details}. Hint: ${error.hint}`);
          return null;
        }

        // Ensure data is always an array of objects, even for empty table.
        const csvData = data && data.length > 0 ? data : columns.length > 0 ? [Object.fromEntries(columns.map(col => [col, '']))] : [];

        return { tableName, data: csvData };
      });

      const results = await Promise.all(exportPromises);

      for (const result of results) {
        if (result) {
          exportData[result.tableName] = result.data;
        }
      }
    }

    if (Object.keys(exportData).length === 0) {
      console.error('No data could be exported. All table queries might have failed or returned no data.');
      return NextResponse.json({ 
        error: 'Keine Daten exportiert.', 
        details: 'Möglicherweise sind alle Tabellen leer oder es gab Fehler beim Datenabruf für alle Tabellen.' 
      }, {
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }

    // Offload ZIP generation to Worker
    const { generateZIP } = await import('@/lib/worker-client');
    const zipResponse = await generateZIP(exportData, 'datenexport.zip');
    
    // Add no-cache headers to the ZIP response
    const headers = new Headers(zipResponse.headers);
    Object.entries(NO_CACHE_HEADERS).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    return new NextResponse(zipResponse.body, {
        status: zipResponse.status,
        statusText: zipResponse.statusText,
        headers
    });
  } catch (error) {
    console.error('Error during data export process:', error);
    return NextResponse.json({ 
        error: 'Fehler beim Exportieren der Daten.', 
        details: (error as Error).message 
    }, {
      status: 500,
      headers: NO_CACHE_HEADERS
    });
  }
}
