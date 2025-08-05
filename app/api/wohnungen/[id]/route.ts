export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET /api/wohnungen/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const wohnungId = params.id;

    // fetch single wohnung + house name
    const { data: wohnungen, error } = await supabase
      .from("Wohnungen")
      .select("id, name, groesse, miete, haus_id, Haeuser(name)")
      .eq("id", wohnungId)
      .limit(1);

    if (error) {
      console.error("GET /api/wohnungen/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!wohnungen || wohnungen.length === 0) {
      return NextResponse.json({ error: "Wohnung nicht gefunden." }, { status: 404 });
    }
    const wohnung = wohnungen[0];

    // fetch tenants for this wohnung
    const { data: tenants, error: tenantsError } = await supabase
      .from("Mieter")
      .select("id, name, einzug, auszug")
      .eq("wohnung_id", wohnungId);

    if (tenantsError) {
      console.error("GET /api/wohnungen/[id] tenants error:", tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { status: 500 });
    }

    const today = new Date();
    // Find current tenant
    const tenant = tenants.find(
      (t) => !t.auszug || new Date(t.auszug) > today
    );

    const enriched = {
      ...wohnung,
      status: tenant ? "vermietet" : "frei",
      tenant: tenant || null,
      mieterCount: tenants.length,
    };

    return NextResponse.json({ wohnung: enriched }, { status: 200 });
  } catch (e) {
    console.error("Server error GET /api/wohnungen/[id]:", e);
    return NextResponse.json(
      { error: "Serverfehler bei Wohnungs-Abfrage." },
      { status: 500 }
    );
  }
}