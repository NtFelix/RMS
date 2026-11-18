import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"
import { requireApiPermission } from "@/lib/api-permissions"
import { apiPermissionErrorResponse } from "@/lib/api-permission-response"

// GET todos
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'ansehen');
    const { data, error } = await supabase
      .from("Aufgaben")
      .select("*")
      .order("erstellungsdatum", { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(data, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    console.error("Error fetching todos:", error)
    return NextResponse.json(
      { error: "Fehler beim Laden der Aufgaben" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// POST new todo
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'erstellen');
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
    
    const { data, error } = await supabase
      .from("Aufgaben")
      .insert([
        {
          name,
          beschreibung,
          ist_erledigt: Boolean(ist_erledigt),
          user_id: user.id
        }
      ])
      .select()
    
    if (error) throw error
    
    return NextResponse.json(data[0], { headers: NO_CACHE_HEADERS })
  } catch (error) {
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    console.error("Error creating todo:", error)
    return NextResponse.json(
      { error: "Fehler beim Erstellen der Aufgabe" },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

// PATCH to update todo status
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
  }
  
  try {
    await requireApiPermission('aufgaben', 'bearbeiten');
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: "Ungültiger JSON-Body" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }
    const { id, ist_erledigt } = body
    
    if (typeof id !== 'string' || id.trim() === '') {
      return NextResponse.json(
        { error: "ID ist erforderlich" },
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
