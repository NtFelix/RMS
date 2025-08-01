import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const apartmentId = searchParams.get("apartment");
    const year = searchParams.get("year");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    let query = supabase.from("Finanzen").select(
      `
        betrag,
        ist_einnahmen,
        Wohnungen ( id, name )
      `,
      { count: "exact" }
    );

    if (apartmentId && apartmentId !== "all") {
      query = query.eq("wohnung_id", apartmentId);
    }

    if (year && year !== "all") {
      query = query.gte("datum", `${year}-01-01`).lte("datum", `${year}-12-31`);
    }

    if (type) {
      if (type === "income") {
        query = query.eq("ist_einnahmen", true);
      } else if (type === "expense") {
        query = query.eq("ist_einnahmen", false);
      }
    }

    if (search) {
      // This is a simplified search. A more complex search across joined tables might require a database function.
      // For now, we search on the 'name' and 'notiz' columns of the Finanzen table.
      // A full text search on joined 'Wohnungen' table name is more complex with postgrest.
      query = query.or(`name.ilike.%${search}%,notiz.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching finance totals:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalIncome = data
      .filter((t) => t.ist_einnahmen)
      .reduce((sum, t) => sum + t.betrag, 0);
    const totalExpenses = data
      .filter((t) => !t.ist_einnahmen)
      .reduce((sum, t) => sum + t.betrag, 0);
    const totalBalance = totalIncome - totalExpenses;
    const transactionCount = count || 0;

    const totals = {
      totalBalance,
      totalIncome,
      totalExpenses,
      transactionCount,
    };

    return NextResponse.json(totals, { status: 200 });
  } catch (e: any) {
    console.error("Server error GET /api/finanzen/totals:", e);
    return NextResponse.json(
      { error: "Serverfehler bei der Abfrage der Finanzsummen." },
      { status: 500 }
    );
  }
}
