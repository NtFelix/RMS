export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { fetchUserProfile } from "@/lib/data-fetching";
import { getPlanDetails } from "@/lib/stripe-server";


export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // === BEGIN NEW LOGIC ===
    const userProfile = await fetchUserProfile(); // This already gets user or returns null

    if (!userProfile) {
        // fetchUserProfile already logs "No user logged in..."
        return NextResponse.json({ error: "Benutzer nicht authentifiziert." }, { status: 401 });
    }
    const userId = userProfile.id; // Get userId from userProfile

    const isTrialActive = userProfile.stripe_subscription_status === 'trialing';

    let currentApartmentLimit: number | null | typeof Infinity = null;

    if (isTrialActive) {
      currentApartmentLimit = 5;
    } else if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);

        if (planDetails === null) {
          console.error(`API: Plan details not found for price_id: ${userProfile.stripe_price_id}`);
          return NextResponse.json({ error: "Details zu Ihrem Abonnementplan konnten nicht gefunden werden." }, { status: 403 });
        }

        if (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen > 0) {
          currentApartmentLimit = planDetails.limitWohnungen;
        } else if (planDetails.limitWohnungen === null || (typeof planDetails.limitWohnungen === 'number' && planDetails.limitWohnungen <= 0)) {
          currentApartmentLimit = Infinity;
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
        return NextResponse.json({ error: "Fehler beim Abrufen der Plandetails für Ihr Abonnement." }, { status: 500 });
      }
    } else {
      // No active subscription or price ID, and not in trial
      return NextResponse.json({ error: "Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen." }, { status: 403 });
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
    // If currentApartmentLimit is still null here, it means neither trial nor subscription is valid.
    // The blocks above (isTrialActive, or active subscription) should have set it or returned an error.
    // This is a fallback / sanity check.
    if (currentApartmentLimit === null) {
        console.warn("API: currentApartmentLimit is null after trial/subscription checks. This indicates a potential logic issue.");
        return NextResponse.json({ error: "Zugriff verweigert. Keine gültige Testphase oder Abonnement gefunden." }, { status: 403 });
    }

    if (currentApartmentLimit !== Infinity) { // Only check if not unlimited
        if (count !== null && count >= currentApartmentLimit) {
            if (isTrialActive) {
                return NextResponse.json({ error: `Maximale Anzahl an Wohnungen (5) für Ihre Testphase erreicht.` }, { status: 403 });
            } else {
                return NextResponse.json({ error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` }, { status: 403 });
            }
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
  const supabase = await createSupabaseServerClient();
  
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
    const supabase = await createSupabaseServerClient();
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
    const supabase = await createSupabaseServerClient();
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
