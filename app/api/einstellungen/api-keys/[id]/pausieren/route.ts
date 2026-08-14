import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Key ID fehlt." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { error } = await supabase.rpc("api_key_pausieren", { p_key_id: id });
    if (error) {
      console.error("Error in api_key_pausieren RPC:", error);
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("Exception in POST api-keys/pausieren:", err);
    return NextResponse.json({ error: err.message || "Interner Serverfehler" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
