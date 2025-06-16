import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { fetchUserProfile } from "@/lib/data-fetching";
import { getPlanDetails } from "@/lib/stripe-server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // === BEGIN NEW LOGIC ===
    const userProfile = await fetchUserProfile(); // This already gets user or returns null

    if (!userProfile) {
        // fetchUserProfile already logs "No user logged in..."
        return NextResponse.json({ error: "Benutzer nicht authentifiziert." }, { status: 401 });
    }
    const userId = userProfile.id; // Get userId from userProfile

    let currentApartmentLimit: number | null = null;

    if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);

        if (planDetails === null) {
          // Plan details not found for their price ID
          console.error(`API: Plan details not found for price_id: ${userProfile.stripe_price_id}`);
          return NextResponse.json({ error: "Details zu Ihrem Abonnementplan konnten nicht gefunden werden." }, { status: 403 });
        }

        if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          currentApartmentLimit = Infinity; // Unlimited
        } else {
          console.error(`API: Invalid limitWohnungen configuration: ${planDetails.limitWohnungen}`);
          return NextResponse.json({ error: "Ungültige Konfiguration für Wohnungslimit in Ihrem Plan." }, { status: 500 });
        }
      } catch (planError: unknown) {
        if (planError instanceof Error) {
          console.error("API: Error fetching plan details for limit enforcement:", planError.message);
          console.error("Stack trace:", planError.stack);
        } else {
          console.error("API: Error fetching plan details for limit enforcement (unknown type):", planError);
        }
        // It's important to inform the user if plan details fetching fails
        return NextResponse.json({ error: "Fehler beim Abrufen der Plandetails für Ihr Abonnement." }, { status: 500 });
      }
    } else {
      // No active subscription or price ID.
      // This means they don't have a plan that allows them to add apartments.
      return NextResponse.json({ error: "Ein aktives Abonnement mit einem gültigen Plan ist erforderlich, um Wohnungen hinzuzufügen." }, { status: 403 });
    }

    // Now, count existing apartments
    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('API: Error counting apartments:', countError);
      return NextResponse.json({ error: "Fehler beim Zählen der Wohnungen." }, { status: 500 });
    }

    // Enforce the limit
    // If currentApartmentLimit is null here, it means the active subscription check failed earlier,
    // or stripe_price_id was missing, and that case should have already returned an error.
    if (currentApartmentLimit === null) {
        // This should ideally be caught by the "Ein aktives Abonnement..." error message.
        console.warn("API: Reached apartment count check with null limit but no active subscription error was returned earlier.");
        return NextResponse.json({ error: "Fehler bei der Ermittlung des Wohnungslimits für Ihr Abonnement." }, { status: 500 });
    }
    }

    if (currentApartmentLimit !== Infinity) { // Only check if not unlimited
        if (count !== null && count >= currentApartmentLimit) {
            return NextResponse.json({ error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` }, { status: 403 });
        }
    }
    // === END NEW LOGIC ===

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
