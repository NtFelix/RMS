import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// GET todos
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from("Aufgaben")
      .select("*")
      .order("erstellungsdatum", { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching todos:", error)
    return NextResponse.json(
      { error: "Fehler beim Laden der Aufgaben" },
      { status: 500 }
    )
  }
}

// POST new todo
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  
  try {
    const body = await request.json()
    const { name, beschreibung, ist_erledigt } = body
    
    if (!name || !beschreibung) {
      return NextResponse.json(
        { error: "Name und Beschreibung sind erforderlich" },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .insert([
        {
          name,
          beschreibung,
          ist_erledigt: ist_erledigt || false
        }
      ])
      .select()
    
    if (error) throw error
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error creating todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Aufgabe" },
      { status: 500 }
    )
  }
}

// PATCH to update todo status
export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServerClient()
  
  try {
    const body = await request.json()
    const { id, ist_erledigt } = body
    
    if (!id) {
      return NextResponse.json(
        { error: "ID ist erforderlich" },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        ist_erledigt,
        aenderungsdatum: new Date().toISOString()
      })
      .eq("id", id)
      .select()
    
    if (error) throw error
    
    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error updating todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Aufgabe" },
      { status: 500 }
    )
  }
}
