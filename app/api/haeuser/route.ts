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
