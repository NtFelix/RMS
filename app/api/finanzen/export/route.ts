export const runtime = 'edge';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('searchQuery');
    const selectedApartment = searchParams.get('selectedApartment');
    const selectedYear = searchParams.get('selectedYear');
    const selectedType = searchParams.get('selectedType');

    const supabase = await createClient();
    const BATCH_SIZE = 5000; // Increased batch size for better performance
    let allData: any[] = [];
    let offset = 0;
    let hasMore = true;

    // Declare apartmentData variable in the outer scope
    let apartmentData: { id: string } | null = null;

    // First, get the total count with the same filters
    let countQuery = supabase
      .from('Finanzen')
      .select('*', { count: 'exact', head: true });

    // If apartment filter is selected, we need to join with Wohnungen
    if (selectedApartment && selectedApartment !== 'Alle Wohnungen') {
      // First get the apartment ID
      const { data: apartment, error: apartmentError } = await supabase
        .from('Wohnungen')
        .select('id')
        .eq('name', selectedApartment)
        .single();

      if (apartmentError) {
        console.error('Error fetching apartment:', apartmentError);
        return NextResponse.json({ error: 'Fehler beim Abrufen der Wohnungsdaten' }, { status: 500 });
      }

      if (!apartment) {
        return NextResponse.json({ error: 'Wohnung nicht gefunden' }, { status: 404 });
      }

      // Store the apartment data for later use
      apartmentData = apartment;

      // Filter by apartment ID directly in the Finanzen table
      countQuery = countQuery.eq('wohnung_id', apartmentData.id);
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
        `name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`
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
        .select('name, datum, betrag, ist_einnahmen, notiz, Wohnungen!left(name)')
        .order('datum', { ascending: false })
        .range(offset, offset + BATCH_SIZE - 1);

      // Apply filters
      if (selectedApartment && selectedApartment !== 'Alle Wohnungen' && apartmentData) {
        // We already have the apartment ID from the count query, so we can use it directly
        query = query.eq('wohnung_id', apartmentData.id);
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
          `name.ilike.%${searchQuery}%,notiz.ilike.%${searchQuery}%`
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

      // Safety check to prevent infinite loops - removed arbitrary limit
      if (offset >= 100000) { // Increased safety limit to 100,000 rows
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

    // Offload CSV generation to Worker
    const { generateCSV } = await import('@/lib/worker-client');
    return await generateCSV(formattedData, 'finanzen-export.csv');
  } catch (e) {
    console.error('Server error GET /api/finanzen/export:', e);
    return NextResponse.json({ error: 'Serverfehler beim Exportieren der Finanzen.' }, { status: 500 });
  }
}
