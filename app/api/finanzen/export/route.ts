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
    let query = supabase.from('Finanzen').select('name, datum, betrag, ist_einnahmen, notiz, Wohnungen(name)');

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

    const { data, error } = await query.order('datum', { ascending: false });

    if (error) {
      console.error('GET /api/finanzen/export error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedData = (data || []).map((item: any) => ({
      'Bezeichnung': item.name,
      'Wohnung': item.Wohnungen?.name || '-',
      'Datum': item.datum,
      'Betrag': item.betrag,
      'Typ': item.ist_einnahmen ? 'Einnahme' : 'Ausgabe',
      'Notiz': item.notiz
    }));

    const csv = Papa.unparse(formattedData);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="finanzen-export.csv"`,
        'Content-Type': 'text/csv;charset=utf-8;',
      },
    });
  } catch (e) {
    console.error('Server error GET /api/finanzen/export:', e);
    return NextResponse.json({ error: 'Serverfehler beim Exportieren der Finanzen.' }, { status: 500 });
  }
}
