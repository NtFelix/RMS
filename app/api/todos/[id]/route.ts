import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"
import { requireApiPermission } from "@/lib/api-permissions"
import { apiPermissionErrorResponse } from "@/lib/api-permission-response"

// GET specific todo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'ansehen');
    const { id } = await params
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .select("*")
      .eq("id", id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Aufgabe nicht gefunden" }, { status: 404, headers: NO_CACHE_HEADERS });
      }
      throw error;
    }
    
    return NextResponse.json(data, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
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
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'bearbeiten');
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Ungültiger JSON-Body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    const { name, beschreibung, ist_erledigt } = body
    
    if (typeof name !== 'string' || name.trim() === '' || typeof beschreibung !== 'string' || beschreibung.trim() === '') {
      return NextResponse.json(
        { error: "Name und Beschreibung sind erforderlich" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    if (typeof ist_erledigt !== 'boolean') {
      return NextResponse.json(
        { error: "ist_erledigt muss ein Boolean sein" },
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

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Aufgabe nicht gefunden" },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }
    
    return NextResponse.json(data[0], { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    console.error("Error updating todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Aktualisieren der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// PATCH to update a todo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }

  try {
    await requireApiPermission('aufgaben', 'bearbeiten');
    const { id } = await params
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Ungültiger JSON-Body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    const { name, beschreibung, ist_erledigt } = body

    const updates: Record<string, string | boolean> = {
      aenderungsdatum: new Date().toISOString()
    }
    if (typeof name === 'string' && name.trim() !== '') {
      updates.name = name
    }
    if (typeof beschreibung === 'string') {
      updates.beschreibung = beschreibung
    }
    if (typeof ist_erledigt === 'boolean') {
      updates.ist_erledigt = ist_erledigt
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json(
        { error: "Keine gültigen Aktualisierungsfelder angegeben" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { data, error } = await supabase
      .from("Aufgaben")
      .update(updates)
      .eq("id", id)
      .select()

    if (error) throw error

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Aufgabe nicht gefunden" },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(data[0], { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
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
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'loeschen');
    const { id } = await params
    
    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: 'Aufgaben',
      p_record_id: id,
    });
    
    if (error) throw error
    
    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    console.error("Error deleting todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Löschen der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
