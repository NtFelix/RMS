import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const APARTMENT_LIMIT = 5;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('API: User not authenticated:', userError);
      return NextResponse.json({ error: "Benutzer nicht authentifiziert." }, { status: 401 });
    }
    const userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_status')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means no rows found, which is a valid case
      console.error('API: Error fetching profile:', profileError);
      return NextResponse.json({ error: "Fehler beim Abrufen des Benutzerprofils." }, { status: 500 });
    }

    if (!profile || profile.stripe_subscription_status !== 'active') {
      return NextResponse.json({ error: "Ein aktives Abonnement ist erforderlich, um Wohnungen hinzuzufügen." }, { status: 403 });
    }

    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('API: Error counting apartments:', countError);
      return NextResponse.json({ error: "Fehler beim Zählen der Wohnungen." }, { status: 500 });
    }

    // const APARTMENT_LIMIT = 5; // Already defined at the top of the file
    if (count !== null && count >= APARTMENT_LIMIT) {
      return NextResponse.json({ error: "Maximale Anzahl an Wohnungen für Ihr Abonnement erreicht." }, { status: 403 });
    }

    const { name, groesse, miete, haus_id } = await request.json();
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('Wohnungen')
      .insert({ name, groesse, miete, haus_id, user_id: userId }) // Add user_id here
      .select();
    if (error) {
      console.error("Supabase Insert Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data[0], { status: 201 });
  } catch (e) {
    console.error("POST /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Speichern der Wohnung." }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  
  // Join Haeuser to get house name
  const { data: apartments, error } = await supabase
    .from('Wohnungen')
    .select('id, name, groesse, miete, haus_id, Haeuser(name)');
  
  if (error) {
    console.error("Supabase Select Error (Wohnungen):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Get tenants to determine occupation status
  const { data: tenants, error: tenantsError } = await supabase
    .from('Mieter')
    .select('id, wohnung_id, auszug, einzug, name');
  
  if (tenantsError) {
    console.error("Supabase Select Error (Mieter):", tenantsError);
    return NextResponse.json({ error: tenantsError.message }, { status: 500 });
  }
  
  // Add status and tenant information
  const today = new Date();
  const enrichedApartments = apartments.map(apt => {
    // Find tenant for this apartment
    const tenant = tenants.find(t => t.wohnung_id === apt.id);
    
    // Determine if apartment is free or rented
    let status = 'frei';
    if (tenant) {
      // If tenant exists with no move-out date or move-out date is in the future
      if (!tenant.auszug || new Date(tenant.auszug) > today) {
        status = 'vermietet';
      }
    }
    
    return {
      ...apt,
      status: status,
      tenant: tenant ? { 
        id: tenant.id, 
        name: tenant.name, 
        einzug: tenant.einzug, 
        auszug: tenant.auszug 
      } : null
    };
  });
  
  return NextResponse.json(enrichedApartments, { status: 200 });
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { status: 400 });
    }
    const { error } = await supabase.from('Wohnungen').delete().match({ id });
    if (error) {
      console.error("Supabase Delete Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Wohnung erfolgreich gelöscht." }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Löschen der Wohnung." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, groesse, miete, haus_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { status: 400 });
    }
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('Wohnungen')
      .update({ name, groesse, miete, haus_id })
      .match({ id })
      .select();
    if (error) {
      console.error("Supabase Update Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Wohnung nicht gefunden oder Update fehlgeschlagen." }, { status: 404 });
    }
    return NextResponse.json(data[0], { status: 200 });
  } catch (e) {
    console.error("PUT /api/wohnungen error:", e);
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren der Wohnung." }, { status: 500 });
  }
}
