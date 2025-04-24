import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { name, groesse, miete, haus_id } = await request.json();
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('Wohnungen')
      .insert({ name, groesse, miete, haus_id })
      .select();
    if (error) {
      console.error("Supabase Insert Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data[0], { status: 201 });
  } catch (e) {
    console.error("POST /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Speichern der Wohnung." }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  // join Haeuser to get haus name
  const { data, error } = await supabase
    .from('Wohnungen')
    .select('id, name, groesse, miete, haus_id, Haeuser(name)');
  if (error) {
    console.error("Supabase Select Error (Wohnungen):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { status: 400 });
    }
    const { error } = await supabase.from('Wohnungen').delete().match({ id });
    if (error) {
      console.error("Supabase Delete Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Wohnung erfolgreich gelöscht." }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Löschen der Wohnung." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, groesse, miete, haus_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { status: 400 });
    }
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('Wohnungen')
      .update({ name, groesse, miete, haus_id })
      .match({ id })
      .select();
    if (error) {
      console.error("Supabase Update Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Wohnung nicht gefunden oder Update fehlgeschlagen." }, { status: 404 });
    }
    return NextResponse.json(data[0], { status: 200 });
  } catch (e) {
    console.error("PUT /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren der Wohnung." }, { status: 500 });
  }
}
