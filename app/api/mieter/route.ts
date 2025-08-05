export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wohnung_id = url.searchParams.get("wohnung_id");
    const supabase = await createClient();
    let query = supabase.from('Mieter').select('*');
    if (wohnung_id) {
      query = query.eq('wohnung_id', wohnung_id);
    }
    const { data, error } = await query;
    if (error) {
      console.error('GET /api/mieter error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // Always wrap in { mieter: [...] } for compatibility
    return NextResponse.json({ mieter: data }, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/mieter:', e);
    return NextResponse.json({ error: 'Serverfehler bei Mieter-Abfrage.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const m = await request.json();
    console.error('POST /api/mieter payload:', m);
    const { data, error } = await supabase.from('Mieter').insert(m).select();
    if (error) {
      console.error('POST /api/mieter error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 });
    }
    return NextResponse.json(data[0], { status: 201 });
  } catch (e) {
    console.error('Server error POST /api/mieter:', e);
    return NextResponse.json({ error: 'Serverfehler beim Erstellen des Mieters.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = await createClient();
    const m = await request.json();
    const { data, error } = await supabase.from('Mieter').update(m).match({ id }).select();
    if (error) {
      console.error('PUT /api/mieter error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data[0], { status: 200 });
  } catch (e) {
    console.error('Server error PUT /api/mieter:', e);
    return NextResponse.json({ error: 'Serverfehler beim Aktualisieren des Mieters.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Mieter-ID erforderlich.' }, { status: 400 });
    const supabase = await createClient();
    const { error } = await supabase.from('Mieter').delete().match({ id });
    if (error) {
      console.error('DELETE /api/mieter error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Mieter gelöscht' }, { status: 200 });
  } catch (e) {
    console.error('Server error DELETE /api/mieter:', e);
    return NextResponse.json({ error: 'Serverfehler beim Löschen des Mieters.' }, { status: 500 });
  }
}
