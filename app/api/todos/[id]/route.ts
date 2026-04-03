export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

// GET specific todo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient()
  
  try {
    const { id } = await params
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .select("*")
      .eq("id", id)
      .single()
    
    if (error) throw error
    
    return NextResponse.json(data, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error("Error fetching todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Laden der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// PUT to update a todo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient()
  
  try {
    const { id } = await params
    const body = await request.json()
    const { name, beschreibung, ist_erledigt } = body
    
    if (!name || !beschreibung) {
      return NextResponse.json(
        { error: "Name und Beschreibung sind erforderlich" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .update({
        name,
        beschreibung,
        ist_erledigt,
        aenderungsdatum: new Date().toISOString()
      })
      .eq("id", id)
      .select()
    
    if (error) throw error
    
    return NextResponse.json(data[0], { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error("Error updating todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// DELETE a todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createSupabaseServerClient()
  
  try {
    const { id } = await params
    
    const { error } = await supabase
      .from("Aufgaben")
      .delete()
      .eq("id", id)
    
    if (error) throw error
    
    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error("Error deleting todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Löschen der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
