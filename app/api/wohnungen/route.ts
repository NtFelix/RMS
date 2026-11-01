import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";
import { checkTenantViewAccess } from "@/lib/tenant-view-access";
import { fetchUserProfile } from "@/lib/data-fetching";
import { getPlanDetails } from "@/lib/stripe-server";
import { isTestEnv } from '@/lib/test-utils';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import { normalizeApartmentLimit } from '@/lib/utils/subscription';
import { getTodayISOString, isTenantActive } from '@/utils/date-calculations';


export async function POST(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'erstellen');

    const supabase = await createSupabaseServerClient();

    // === BEGIN NEW LOGIC ===
    const userProfile = await fetchUserProfile(); // This already gets user or returns null

    if (!userProfile) {
      // fetchUserProfile already logs "No user logged in..."
      return NextResponse.json({ error: "Benutzer nicht authentifiziert." }, { 
        status: 401,
        headers: NO_CACHE_HEADERS
      });
    }
    const userId = userProfile.id; // Get userId from userProfile

    const isTrialActive = userProfile.stripe_subscription_status === 'trialing';

    let currentApartmentLimit: number | null | typeof Infinity = null;

    if (isTrialActive) {
      currentApartmentLimit = 5;
    } else if (isTestEnv()) {
      // Bypass for E2E tests
      currentApartmentLimit = 100;
    } else if (userProfile.stripe_subscription_status === 'active' && userProfile.stripe_price_id) {
      try {
        const planDetails = await getPlanDetails(userProfile.stripe_price_id);

        if (planDetails === null) {
          console.error(`API: Plan details not found for price_id: ${userProfile.stripe_price_id}`);
          return NextResponse.json({ error: "Details zu Ihrem Abonnementplan konnten nicht gefunden werden." }, { 
            status: 403,
            headers: NO_CACHE_HEADERS
          });
        }

        // Use centralized normalization: null, 0, or negative = unlimited (Infinity)
        const normalizedLimit = normalizeApartmentLimit(planDetails.limit_wohnungen);
        
        if (normalizedLimit === null) {
          console.error(`API: Invalid limit_wohnungen configuration: ${planDetails.limit_wohnungen}`);
          return NextResponse.json({ error: "Ungültige Konfiguration für Wohnungslimit in Ihrem Plan." }, { 
            status: 500,
            headers: NO_CACHE_HEADERS
          });
        }
        
        currentApartmentLimit = normalizedLimit;
      } catch (planError: unknown) {
        if (planError instanceof Error) {
          console.error("API: Error fetching plan details for limit enforcement:", planError.message);
          console.error("Stack trace:", planError.stack);
        } else {
          console.error("API: Error fetching plan details for limit enforcement (unknown type):", planError);
        }
        return NextResponse.json({ error: "Fehler beim Abrufen der Plandetails für Ihr Abonnement." }, { 
          status: 500,
          headers: NO_CACHE_HEADERS
        });
      }
    } else {
      // No active subscription or price ID, and not in trial
      return NextResponse.json({ error: "Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen." }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    const { count, error: countError } = await supabase
      .from('Wohnungen')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('API: Error counting apartments:', countError);
      return NextResponse.json({ error: "Fehler beim Zählen der Wohnungen." }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }

    // Enforce the limit
    // If currentApartmentLimit is still null here, it means neither trial nor subscription is valid.
    // The blocks above (isTrialActive, or active subscription) should have set it or returned an error.
    // This is a fallback / sanity check.
    if (currentApartmentLimit === null) {
      console.warn("API: currentApartmentLimit is null after trial/subscription checks. This indicates a potential logic issue.");
      return NextResponse.json({ error: "Zugriff verweigert. Keine gültige Testphase oder Abonnement gefunden." }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    if (currentApartmentLimit !== Infinity) { // Only check if not unlimited
      if (count !== null && count >= currentApartmentLimit) {
        if (isTrialActive) {
          return NextResponse.json({ error: `Maximale Anzahl an Wohnungen (5) für Ihre Testphase erreicht.` }, { 
            status: 403,
            headers: NO_CACHE_HEADERS
          });
        } else {
          return NextResponse.json({ error: `Maximale Anzahl an Wohnungen (${currentApartmentLimit}) für Ihr Abonnement erreicht.` }, { 
            status: 403,
            headers: NO_CACHE_HEADERS
          });
        }
      }
    }
    // === END NEW LOGIC ===

    const { name, groesse, miete, haus_id } = await request.json();
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }

    if (haus_id && !(await verifyEntityInScope(haus_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    const { data, error } = await supabase
      .from('Wohnungen')
      .insert({ name, groesse, miete, haus_id })
      .select();
    if (error) {
      console.error("Supabase Insert Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }
    return NextResponse.json(data[0], { 
      status: 201,
      headers: NO_CACHE_HEADERS
    });
  } catch (e) {
    console.error("POST /api/wohnungen error:", e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Speichern der Wohnung." }, { 
      status,
      headers: NO_CACHE_HEADERS
    });
  }
}

export async function GET() {
  try {
    // Apartment names and tenant data only for users who may see apartments (as the Wohnungen page does)
    const { requireApiPermission } = await import("@/lib/api-permissions");
    // The tenant right starts at once and is awaited only before the tenant query, so it runs in parallel with the
    // apartment query (no extra round-trip); a failed check is repeated once inside (see checkTenantViewAccess). The
    // no-op catch only prevents an unhandled rejection when the wohnungen check below throws first; a real rejection
    // still surfaces at the `await` further down.
    const tenantAccessPromise = checkTenantViewAccess();
    tenantAccessPromise.catch(() => {});
    await requireApiPermission('wohnungen', 'ansehen');

    const supabase = await createSupabaseServerClient();
    const { getAccessibleHaeuserIds } = await import("@/lib/object-scope");
    const accessibleIds = await getAccessibleHaeuserIds();

    // Join Haeuser to get house name
    let q = supabase
      .from('Wohnungen')
      .select('id, name, groesse, miete, haus_id, Haeuser(name)');

    if (accessibleIds !== null) {
      q = q.in('haus_id', accessibleIds);
    }

    const { data: apartments, error } = await q;

    if (error) {
      console.error("Supabase Select Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }

    // Without mieter:ansehen only the dates for the occupation status are read: no name and no id of a tenant is even
    // loaded, so none can leave through this route. This holds the same when the check failed twice: the apartments
    // are still answered (they depend on wohnungen:ansehen only), the tenants stay withheld and `permissionCheckFailed`
    // tells the client that this may be wrong.
    const tenantAccess = await tenantAccessPromise;
    const canViewTenants = tenantAccess.canViewTenants;
    const permissionCheckFailed = !tenantAccess.canViewTenants && tenantAccess.permissionCheckFailed;

    // Get tenants to determine occupation status
    // (two literal selects: the typed client cannot parse a column list that is chosen at runtime)
    let tenantsQuery = canViewTenants
      ? supabase.from('Mieter').select('id, wohnung_id, auszug, einzug, name')
      : supabase.from('Mieter').select('wohnung_id, auszug, einzug');

    if (accessibleIds !== null && apartments) {
      const accessibleWohnungIds = apartments.map(a => a.id);
      tenantsQuery = tenantsQuery.in('wohnung_id', accessibleWohnungIds);
    }

    const { data: tenantRows, error: tenantsError } = await tenantsQuery;
    // Widened: `id` and `name` are only there with mieter:ansehen (see the two selects above)
    const tenants = tenantRows as Array<{
      wohnung_id: string | null;
      auszug: string | null;
      einzug: string | null;
      id?: string;
      name?: string;
    }> | null;

    if (tenantsError) {
      console.error("Supabase Select Error (Mieter):", tenantsError);
      return NextResponse.json({ error: tenantsError.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }

    // Add status and tenant information
    const todayStr = getTodayISOString();

    const enrichedApartments = (apartments || []).map(apt => {
      // Find tenant for this apartment
      const tenant = (tenants || []).find(t => t.wohnung_id === apt.id);

      // Determine if apartment is free or rented
      let status = 'frei';
      if (tenant && isTenantActive(tenant.auszug, todayStr)) {
        status = 'vermietet';
      }

      // Without mieter:ansehen: the status stays, `tenant` is absent and `tenantAccess: false` tells the client that
      // this is "no access" and not "no tenant"; `permissionCheckFailed` only when the check failed (not for a
      // missing right)
      if (!canViewTenants) {
        return { ...apt, status, tenantAccess: false, ...(permissionCheckFailed ? { permissionCheckFailed: true } : {}) };
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

    return NextResponse.json(enrichedApartments, { 
      status: 200,
      headers: NO_CACHE_HEADERS
    });
  } catch (e) {
    console.error("GET /api/wohnungen error:", e);
    // 403 PERMISSION_DENIED (right missing) or 503 PERMISSION_CHECK_FAILED (the check itself failed)
    const permissionResponse = apiPermissionErrorResponse(e);
    if (permissionResponse) return permissionResponse;
    return NextResponse.json({ error: "Serverfehler bei Wohnungs-Abfrage." }, {
      status: 500,
      headers: NO_CACHE_HEADERS
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'loeschen');

    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }

    // Check if current Wohnung is in accessible scope
    const { data: currentApt, error: checkError } = await supabase
      .from('Wohnungen')
      .select('haus_id')
      .eq('id', id)
      .single();

    if (checkError || !currentApt || !(await verifyEntityInScope(currentApt.haus_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: 'Wohnungen',
      p_record_id: id,
    });
    if (error) {
      console.error("Supabase Delete Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }
    return NextResponse.json({ message: "Wohnung erfolgreich gelöscht." }, { 
      status: 200,
      headers: NO_CACHE_HEADERS
    });
  } catch (e) {
    console.error("DELETE /api/wohnungen error:", e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Löschen der Wohnung." }, { 
      status,
      headers: NO_CACHE_HEADERS
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('wohnungen', 'bearbeiten');

    const supabase = await createSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, groesse, miete, haus_id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Wohnungs-ID ist erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }
    if (!name || groesse == null || miete == null) {
      return NextResponse.json({ error: "Name, Größe und Miete sind erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }

    // Check scope of existing Wohnung
    const { data: currentApt, error: checkError } = await supabase
      .from('Wohnungen')
      .select('haus_id')
      .eq('id', id)
      .single();

    if (checkError || !currentApt || !(await verifyEntityInScope(currentApt.haus_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    // Check scope of new house target
    if (haus_id && !(await verifyEntityInScope(haus_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      });
    }

    const { data, error } = await supabase
      .from('Wohnungen')
      .update({ name, groesse, miete, haus_id })
      .match({ id })
      .select();
    if (error) {
      console.error("Supabase Update Error (Wohnungen):", error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Wohnung nicht gefunden oder Update fehlgeschlagen." }, { 
        status: 404,
        headers: NO_CACHE_HEADERS
      });
    }
    return NextResponse.json(data[0], { 
      status: 200,
      headers: NO_CACHE_HEADERS
    });
  } catch (e) {
    console.error("PUT /api/wohnungen error:", e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Aktualisieren der Wohnung." }, { 
      status,
      headers: NO_CACHE_HEADERS
    });
  }
}
