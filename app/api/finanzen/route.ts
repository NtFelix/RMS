export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const limit = parseInt(searchParams.get("limit") ?? "25");

    // Filter parameters
    const apartmentId = searchParams.get("apartment");
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let query = supabase
      .from("Finanzen")
      .select("*, Wohnungen(name)", { count: "exact" });

    // Apply filters
    if (apartmentId && apartmentId !== "all") {
      query = query.eq("wohnung_id", apartmentId);
    }
    if (year && year !== "all") {
      query = query.gte("datum", `${year}-01-01`).lte("datum", `${year}-12-31`);
    }
    if (type) {
      if (type === "income") {
        query = query.eq("ist_einnahmen", true);
      } else if (type === "expense") {
        query = query.eq("ist_einnahmen", false);
      }
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,notiz.ilike.%${search}%,Wohnungen.name.ilike.%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order("datum", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("GET /api/finanzen error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count ?? 0;
    const hasMore = offset + data.length < total;

    const response = {
      data,
      pagination: {
        offset,
        limit,
        total,
        hasMore,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e: any) {
    console.error("Server error GET /api/finanzen:", e);
    return NextResponse.json(
      { error: "Serverfehler bei Finanzen-Abfrage." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const data = await request.json();
    
    const { error, data: result } = await supabase
      .from('Finanzen')
      .insert(data)
      .select('*, Wohnungen(name)')
      .single();
      
    if (error) {
      console.error('POST /api/finanzen error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 });
    }
    
    if (!result) {
      return NextResponse.json({ error: 'Transaktion konnte nicht erstellt werden' }, { status: 500 });
    }
    
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('Server error POST /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Erstellen der Transaktion.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const supabase = await createClient();
    const data = await request.json();
    
    const { error, data: result } = await supabase
      .from('Finanzen')
      .update(data)
      .match({ id })
      .select();
      
    if (error) {
      console.error('PUT /api/finanzen error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: 400 });
    }
    
    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Transaktion nicht gefunden.' }, { status: 404 });
    }
    
    return NextResponse.json(result[0], { status: 200 });
  } catch (e) {
    console.error('Server error PUT /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Aktualisieren der Transaktion.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Transaktions-ID erforderlich.' }, { status: 400 });
    }
    
    const supabase = await createClient();
    const { error } = await supabase.from('Finanzen').delete().match({ id });
    
    if (error) {
      console.error('DELETE /api/finanzen error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Transaktion gelöscht' }, { status: 200 });
  } catch (e) {
    console.error('Server error DELETE /api/finanzen:', e);
    return NextResponse.json({ error: 'Serverfehler beim Löschen der Transaktion.' }, { status: 500 });
  }
}
