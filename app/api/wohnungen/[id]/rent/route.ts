export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { fetchUserProfile } from "@/lib/data-fetching";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const userProfile = await fetchUserProfile();
    if (!userProfile) {
      return NextResponse.json({ error: "Benutzer nicht authentifiziert." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { id: wohnungId } = await params;
    
    // Fetch apartment rent information
    const { data: apartment, error } = await supabase
      .from('Wohnungen')
      .select('miete')
      .eq('id', wohnungId)
      .eq('user_id', userProfile.id) // Ensure user owns this apartment
      .single();

    if (error) {
      console.error("Supabase Select Error (Wohnung rent):", error);
      return NextResponse.json({ error: "Wohnung nicht gefunden." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    if (!apartment) {
      return NextResponse.json({ error: "Wohnung nicht gefunden." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ miete: apartment.miete }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (e) {
    console.error("GET /api/wohnungen/[id]/rent error:", e);
    return NextResponse.json({ error: "Serverfehler beim Abrufen der Mietdaten." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}