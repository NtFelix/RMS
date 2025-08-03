export const runtime = 'edge';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import Papa from 'papaparse';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('searchQuery');
    const selectedApartment = searchParams.get('selectedApartment');
    const selectedYear = searchParams.get('selectedYear');
    const selectedType = searchParams.get('selectedType');

    const supabase = await createClient();
    const BATCH_SIZE = 1000; // Process 1000 records at a time
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    // First, get the total count with the same filters
    const countQuery = supabase
      .from('Finanzen')
      .select('*', { count: 'exact', head: true });

    // Apply the same filters to the count query
    if (selectedApartment && selectedApartment !== 'Alle Wohnungen') {
      countQuery.eq('Wohnungen.name', selectedApartment);
    }
    if (selectedYear && selectedYear !== 'Alle Jahre') {
      countQuery.gte('datum', `${selectedYear}-01-01`).lte('datum', `${selectedYear}-12-31`);
    }
    if (selectedType && selectedType !== 'Alle Transaktionen') {
      const isEinnahme = selectedType === 'Einnahme';
      countQuery.eq('ist_einnahmen', isEinnahme);
    }
    if (searchQuery) {
      countQuery.or(
        `name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%,Wohnungen.name.ilike.%${searchQuery}%`
      );
    }

    const { count } = await countQuery;
    
    if (count === 0) {
      return new NextResponse('', {
        status: 200,
        headers: {
          'Content-Disposition': 'attachment; filename="finanzen-export.csv"',
          'Content-Type': 'text/csv;charset=utf-8;',
        },
      });
    }

    // Now fetch the data in batches
    while (hasMore) {
      let query = supabase
        .from('Finanzen')
        .select('name, datum, betrag, ist_einnahmen, notiz, Wohnungen(name)')
        .order('datum', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      // Apply filters
      if (selectedApartment && selectedApartment !== 'Alle Wohnungen') {
        query = query.eq('Wohnungen.name', selectedApartment);
      }
      if (selectedYear && selectedYear !== 'Alle Jahre') {
        query = query.gte('datum', `${selectedYear}-01-01`).lte('datum', `${selectedYear}-12-31`);
      }
      if (selectedType && selectedType !== 'Alle Transaktionen') {
        const isEinnahme = selectedType === 'Einnahme';
        query = query.eq('ist_einnahmen', isEinnahme);
      }
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%,Wohnungen.name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching batch:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData = [...allData, ...data];
        offset += BATCH_SIZE;
      }

      // Safety check to prevent infinite loops
      if (offset >= 25000) { // Max 25,000 rows
        hasMore = false;
      }
    }

    const formattedData = allData.map((item: any) => ({
      'Bezeichnung': item.name,
      'Wohnung': item.Wohnungen?.name || '-',
      'Datum': item.datum,
      'Betrag': item.betrag,
      'Typ': item.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      'Notiz': item.notiz || ''
    }));

    const csv = Papa.unparse(formattedData);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="finanzen-export.csv"',
        'Content-Type': 'text/csv;charset=utf-8;',
      },
    });
  } catch (e) {
    console.error('Server error GET /api/finanzen/export:', e);
    return NextResponse.json({ error: 'Serverfehler beim Exportieren der Finanzen.' }, { status: 500 });
  }
}
