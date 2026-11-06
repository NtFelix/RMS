import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { calculateMissedPayments } from "@/utils/tenant-payment-calculations";
import { logger } from "@/utils/logger";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { MIETER_SPALTEN_OHNE_KAUTION } from "@/lib/mieter-columns";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    try {
        const supabase = await createSupabaseServerClient();
        const { tenantId } = await params;

        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID is required." }, { status: 400, headers: NO_CACHE_HEADERS });
        }

        // This route derives payment data from a tenant's rent income (Finanzen), so it needs mieter:ansehen AND
        // finanzen:ansehen: 403 PERMISSION_DENIED if one is missing, 503 PERMISSION_CHECK_FAILED if a check itself
        // failed (see the catch). Checked before anything is read.
        const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
        await Promise.all([
            requireApiPermission('mieter', 'ansehen'),
            requireApiPermission('finanzen', 'ansehen'),
        ]);

        // Fetch tenant with apartment details
        // Explizite Spaltenliste ohne das Altfeld "kaution" (Kautionsdaten sind an das Modul "kautionen" gebunden;
        // die Zeile wird hier nur berechnet, aber nie ausgeliefert).
        const { data: tenant, error: tenantError } = await supabase
            .from('Mieter')
            .select(`
        ${MIETER_SPALTEN_OHNE_KAUTION},
        Wohnungen (
          id,
          name,
          miete,
          groesse,
          haus_id
        )
      `)
            .eq('id', tenantId)
            .single();

        if (tenantError || !tenant) {
            return NextResponse.json({ error: "Tenant not found." }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        // The tenant's apartment must belong to a house the user may access (house scope); checked before any rent
        // income is read
        if (tenant.wohnung_id && !(await verifyWohnungInScope(tenant.wohnung_id))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        // Fetch finances for this tenant's apartment
        // We fetch all finances since move-in to be safe
        // We fetch all finances since the start of the move-in month to be safe
        if (!tenant.einzug) {
            logger.error("Cannot calculate missed payments for tenant without move-in date.", undefined, { tenantId });
            return NextResponse.json({ error: "Tenant move-in date is missing." }, { status: 400, headers: NO_CACHE_HEADERS });
        }
        const moveInDate = new Date(tenant.einzug);
        // Reset to the first day of the month to ensure we catch payments made on the 1st
        moveInDate.setDate(1);
        const moveInDateStr = moveInDate.toISOString().split('T')[0];

        const { data: finances, error: financesError } = await supabase
            .from('Finanzen')
            .select('*')
            .eq('wohnung_id', tenant.wohnung_id)
            .eq('ist_einnahmen', true)
            .gte('datum', moveInDateStr)
            .order('datum', { ascending: true });

        if (financesError) {
            return NextResponse.json({ error: "Failed to fetch finances." }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        const missedPayments = calculateMissedPayments(tenant, finances || [], true);

        return NextResponse.json({
            missedPayments,
            hasMissingPayments: missedPayments.totalAmount > 0
        }, { headers: NO_CACHE_HEADERS });

    } catch (error) {
        // 403 PERMISSION_DENIED (right missing) or 503 PERMISSION_CHECK_FAILED (the check itself failed)
        const permissionResponse = apiPermissionErrorResponse(error);
        if (permissionResponse) return permissionResponse;
        logger.error("Error in missed payments API:", error as Error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
