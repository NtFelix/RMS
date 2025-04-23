import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { name, strasse, ort } = await request.json()
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { status: 400 })
    }
    const { data, error } = await supabase.from('Haeuser').insert({ name, strasse, ort })
    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error("POST /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Speichern des Hauses." }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('Haeuser').select("*")
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 200 })
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { status: 400 })
    }

    const { error } = await supabase.from('Haeuser').delete().match({ id })

    if (error) {
      console.error("Supabase Delete Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Haus erfolgreich gelöscht." }, { status: 200 })
  } catch (e) {
    console.error("DELETE /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Löschen des Hauses." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const { name, strasse, ort } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { status: 400 })
    }
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('Haeuser')
      .update({ name, strasse, ort })
      .match({ id })
      .select() // Select the updated row to return it

    if (error) {
      console.error("Supabase Update Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "Haus nicht gefunden oder Update fehlgeschlagen." }, { status: 404 })
    }

    return NextResponse.json(data[0], { status: 200 })
  } catch (e) {
    console.error("PUT /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren des Hauses." }, { status: 500 })
  }
}
