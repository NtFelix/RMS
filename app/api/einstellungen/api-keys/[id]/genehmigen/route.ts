import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { generateApiKeySecret } from "@/lib/api-keys";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { findBlockedModules } from "@/lib/blocked-modules";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Key ID fehlt." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const supabase = await createSupabaseServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const body = await request.json();
    const { berechtigungen, environment } = body;

    // Das Modul "kautionen" darf API-Schlüsseln nie zugewiesen werden (R2). Vor der Schlüsselerzeugung prüfen.
    if (findBlockedModules(berechtigungen).length > 0) {
      return NextResponse.json({ error: "Das Modul \"Kautionen\" kann API-Schlüsseln nicht zugewiesen werden." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Generate plain secret, hash, and prefix securely on the server
    const { plaintext, key_hash, key_prefix } = generateApiKeySecret(environment === "test" ? "test" : "live");

    const { data, error } = await supabase.rpc("api_key_genehmigen", {
      p_key_id: id,
      p_berechtigungen: berechtigungen || {},
      p_key_hash: key_hash,
      p_key_prefix: key_prefix,
    });

    if (error) {
      console.error("Error in api_key_genehmigen RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Return the plaintext secret ONCE to the approving admin
    return NextResponse.json(
      {
        ...data,
        plaintext,
        key_prefix,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: unknown) {
    console.error("Exception in POST api-keys/genehmigen:", err);
    return NextResponse.json({ error: "Ein interner Serverfehler ist aufgetreten." }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
