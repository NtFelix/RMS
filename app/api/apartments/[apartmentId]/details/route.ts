import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { createRequestLogger } from "@/utils/logger";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { apartmentId } = await params;

    // Both checks start at once. wohnungen:ansehen is required for the route: 403 PERMISSION_DENIED if it is missing, 503
    // PERMISSION_CHECK_FAILED if the check itself failed (see the catch); it runs in parallel with the apartment query
    // and is awaited right after it, before anything is evaluated or answered. mieter:ansehen is awaited only before the
    // tenant query. The no-op catches only prevent an unhandled rejection on an early return; the rejection still
    // surfaces at the await.
    const { requireApiPermission, hasApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions");
    const permissionCheck = requireApiPermission('wohnungen', 'ansehen');
    permissionCheck.catch(() => {});
    const canViewTenantsPromise = hasApiPermission('mieter', 'ansehen');
    canViewTenantsPromise.catch(() => {});

    if (!apartmentId) {
      return NextResponse.json({ error: "Apartment ID ist erforderlich." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    // Fetch apartment details with house information
    const apartmentQuery = supabase
      .from('Wohnungen')
      .select(`
        id,
        name,
        groesse,
        miete,
        haus_id,
        Haeuser!inner(name)
      `)
      .eq('id', apartmentId)
      .single();
    const [{ data: apartment, error: apartmentError }] = await Promise.all([apartmentQuery, permissionCheck]);

    if (apartmentError) {
      const logger = createRequestLogger(request);
      logger.error("Error fetching apartment", new Error(apartmentError.message), {
        apartmentId,
        errorCode: apartmentError.code,
        details: apartmentError.details
      });
      
      if (apartmentError.code === 'PGRST116' || apartmentError.message?.includes('No rows returned')) {
        return NextResponse.json(
          { error: "Wohnung nicht gefunden." }, 
          { status: 404, headers: NO_CACHE_HEADERS }
        );
      }
      return NextResponse.json(
        { error: "Fehler beim Laden der Wohnungsdaten." }, 
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    if (apartment.haus_id && !(await verifyEntityInScope(apartment.haus_id))) {
      return NextResponse.json(
        { error: "Permission denied" }, 
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Tenant data only with mieter:ansehen. Without it no tenant column is read at all; a failed check throws
    // PermissionCheckError (503, see the catch) instead of being shown as "no access".
    const canViewTenants = await canViewTenantsPromise;

    // Fetch current tenant (if any)
    const today = new Date().toISOString();
    // Nur die benötigten Spalten; das Altfeld "kaution" wird bewusst nicht gelesen.
    const tenantResult = canViewTenants
      ? await supabase
          .from('Mieter')
          .select('id, name, email, telefonnummer, einzug, auszug, notiz')
          .eq('wohnung_id', apartmentId)
          .or(`auszug.is.null,auszug.gt.${today}`)
          .order('einzug', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };
    const { data: tenant, error: tenantError } = tenantResult;

    if (tenantError) {
      const logger = createRequestLogger(request);
      logger.warn("Error fetching tenant", {
        error: tenantError.message,
        apartmentId,
        errorCode: tenantError.code,
        details: tenantError.details
      });
      // Continue without tenant data
    }

    // Add type assertion for the apartment with Haeuser
    const apartmentWithHaeuser = apartment as typeof apartment & {
      Haeuser: { name: string } | null;
    };

    // Transform the data to match the expected interface
    const response = {
      apartment: {
        id: apartment.id,
        name: apartment.name,
        groesse: apartment.groesse,
        miete: apartment.miete,
        haus_id: apartment.haus_id,
        hausName: apartmentWithHaeuser.Haeuser?.name || 'Unbekannt',
        // Note: amenities, condition, notes are not in the current schema
        // These would need to be added to the database schema if required
        amenities: [],
        condition: undefined,
        notes: undefined,
      },
      // Without mieter:ansehen: no `tenant`; `tenantAccess: false` marks "no access" (not "no tenant")
      ...(canViewTenants ? {} : { tenantAccess: false }),
      tenant: tenant ? {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        telefon: tenant.telefonnummer,
        einzug: tenant.einzug,
        auszug: tenant.auszug,
        leaseTerms: undefined, // Not in current schema
        paymentHistory: [], // Would need separate table/implementation
        notes: tenant.notiz,
      } : undefined,
    };

    return NextResponse.json(response, { status: 200, headers: NO_CACHE_HEADERS });
    } catch (error) {
    // 403 PERMISSION_DENIED / 503 PERMISSION_CHECK_FAILED if a module right is missing / could not be checked
    const permissionResponse = apiPermissionErrorResponse(error);
    if (permissionResponse) return permissionResponse;
    const logger = createRequestLogger(request);
    logger.error("Unexpected error in GET /api/apartments/[apartmentId]/details", error instanceof Error ? error : new Error(String(error)), {
      apartmentId: (await params).apartmentId
    });
    return NextResponse.json(
      { error: "Serverfehler beim Laden der Details." }, 
      { status: 500, headers: NO_CACHE_HEADERS }
    );
    }
    }