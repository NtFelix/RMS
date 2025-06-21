import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import Papa from 'papaparse';
import JSZip from 'jszip';

// Define a helper function to remove foreign key columns and user_id
const sanitizeData = (data: any[], foreignKeys: string[]) => {
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map(item => {
    const newItem = { ...item };
    foreignKeys.forEach(key => delete newItem[key]);
    delete newItem.user_id; // Remove user_id from all tables
    return newItem;
  });
};

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const zip = new JSZip();

    // Define tables and their foreign keys to be excluded
    const tablesToExport = [
      { name: 'Haeuser', foreignKeys: [] },
      { name: 'Wohnungen', foreignKeys: ['haus_id'] },
      { name: 'Mieter', foreignKeys: ['wohnung_id'] },
      { name: 'Finanzen', foreignKeys: ['wohnung_id'] },
      { name: 'Nebenkosten', foreignKeys: ['haeuser_id'] },
      { name: 'Aufgaben', foreignKeys: [] },
      { name: 'Rechnungen', foreignKeys: ['nebenkosten_id', 'mieter_id'] },
      { name: 'Wasserzaehler', foreignKeys: ['mieter_id', 'nebenkosten_id'] }, // Assuming these FKs based on typical structure
    ];

    for (const tableInfo of tablesToExport) {
      const { data, error } = await supabase
        .from(tableInfo.name)
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error(`Error fetching ${tableInfo.name}:`, error);
        // Optionally, decide if you want to throw an error or continue
        // For now, we'll log and continue, so a partial export might be possible
        zip.file(`${tableInfo.name}.csv`, `Error fetching data: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const sanitized = sanitizeData(data, tableInfo.foreignKeys);
        if (sanitized.length > 0) {
          const csv = Papa.unparse(sanitized);
          zip.file(`${tableInfo.name}.csv`, csv);
        } else {
          zip.file(`${tableInfo.name}.csv`, ''); // Add empty file if all data was removed (e.g. only FKs) or data was empty
        }
      } else {
        zip.file(`${tableInfo.name}.csv`, ''); // Add empty file if no data
      }
    }

    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });

    return new NextResponse(zipContent, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="datenexport.zip"',
        'Content-Type': 'application/zip',
      },
    });

  } catch (error) {
    console.error('Error generating export:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to generate export' }), { status: 500 });
  }
}
