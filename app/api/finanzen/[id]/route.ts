export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET spezifische Finanztransaktion by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('Finanzen')
      .select('*, Wohnungen(name)')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error(`GET /api/finanzen/${id} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
    }
    
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    console.error('Server error GET /api/finanzen/[id]:', e);
    return NextResponse.json({ error: 'Serverfehler bei Finanzen-Abfrage.' }, { status: 500 });
  }
}

// PATCH um Finanztransaktion zu aktualisieren
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const supabase = await createSupabaseServerClient();
    
    if (body.hasOwnProperty('ist_einnahmen')) {
      const { data, error } = await supabase
        .from('Finanzen')
        .update({ ist_einnahmen: body.ist_einnahmen })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error(`PATCH /api/finanzen/${id} error:`, error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
      }
      
      return NextResponse.json(data[0], { status: 200 });
    } else {
      const { data, error } = await supabase
        .from('Finanzen')
        .update(body)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error(`PATCH /api/finanzen/${id} error:`, error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
      }
      
      return NextResponse.json(data[0], { status: 200 });
    }
  } catch (e) {
    console.error('Server error PATCH /api/finanzen/[id]:', e);
    return NextResponse.json({ error: 'Serverfehler beim Aktualisieren der Transaktion.' }, { status: 500 });
  }
}

// PUT um Finanztransaktion zu aktualisieren
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('Finanzen')
      .update(body)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error(`PUT /api/finanzen/${id} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
    }
    
    return NextResponse.json(data[0], { status: 200 });
  } catch (e) {
    console.error('Server error PUT /api/finanzen/[id]:', e);
    return NextResponse.json({ error: 'Serverfehler beim Aktualisieren der Transaktion.' }, { status: 500 });
  }
}

// DELETE um Finanztransaktion zu löschen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('Finanzen')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`DELETE /api/finanzen/${id} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Transaktion gelöscht' }, { status: 200 });
  } catch (e) {
    console.error('Server error DELETE /api/finanzen/[id]:', e);
    return NextResponse.json({ error: 'Serverfehler beim Löschen der Transaktion.' }, { status: 500 });
  }
}