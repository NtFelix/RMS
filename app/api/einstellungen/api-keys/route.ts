import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { data, error } = await supabase.rpc("api_keys_liste");
    if (error) {
      console.error("Error in api_keys_liste RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(data || [], { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    console.error("Exception in GET /api/einstellungen/api-keys:", err);
    return NextResponse.json({ error: "Ein interner Serverfehler ist aufgetreten." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await request.json();
    const { name, angefragte_berechtigungen, environment, expires_at } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Ein Name für den API-Key ist erforderlich." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Der Name des API-Keys darf maximal 100 Zeichen lang sein." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    if (expires_at) {
      const expDate = new Date(expires_at);
      if (isNaN(expDate.getTime()) || expDate.getTime() <= Date.now()) {
        return NextResponse.json({ error: "Das Ablaufdatum muss in der Zukunft liegen." }, { status: 400, headers: NO_CACHE_HEADERS });
      }
    }

    const { data: keyId, error } = await supabase.rpc("api_key_anfragen", {
      p_name: name.trim(),
      p_angefragte_berechtigungen: angefragte_berechtigungen || null,
      p_environment: environment || "live",
      p_expires_at: expires_at || null,
    });

    if (error) {
      console.error("Error in api_key_anfragen RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ id: keyId, success: true }, { status: 201, headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    console.error("Exception in POST /api/einstellungen/api-keys:", err);
    return NextResponse.json({ error: "Ein interner Serverfehler ist aufgetreten." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
