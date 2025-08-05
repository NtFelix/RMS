export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET /api/haeuser/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const hausId = params.id;

    // fetch the house
    const { data: hauser, error } = await supabase
      .from("Haeuser")
      .select("*")
      .eq("id", hausId)
      .limit(1);

    if (error) {
      console.error("GET /api/haeuser/[id] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!hauser || hauser.length === 0) {
      return NextResponse.json({ error: "Haus nicht gefunden." }, { status: 404 });
    }
    const haus = hauser[0];

    // fetch all wohnungen for this house
    const { data: wohnungen, error: wohnError } = await supabase
      .from("Wohnungen")
      .select("id, groesse, miete")
      .eq("haus_id", hausId);

    if (wohnError) {
      console.error("GET /api/haeuser/[id] wohnungen error:", wohnError);
      return NextResponse.json({ error: wohnError.message }, { status: 500 });
    }

    // Compute enrichment fields
    const size =
      wohnungen && wohnungen.length > 0
        ? wohnungen.reduce((acc, w) => acc + (Number(w.groesse) || 0), 0)
        : undefined;
    const rent =
      wohnungen && wohnungen.length > 0
        ? wohnungen.reduce((acc, w) => acc + (Number(w.miete) || 0), 0)
        : undefined;
    const pricePerSqm =
      size && rent && size > 0 ? Math.round((Number(rent) / Number(size)) * 100) / 100 : undefined;

    // Return enriched house
    const enriched = {
      ...haus,
      groesse: size,
      rent: rent,
      pricePerSqm,
    };

    return NextResponse.json({ house: enriched }, { status: 200 });
  } catch (e) {
    console.error("Server error GET /api/haeuser/[id]:", e);
    return NextResponse.json(
      { error: "Serverfehler bei Haus-Abfrage." },
      { status: 500 }
    );
  }
}