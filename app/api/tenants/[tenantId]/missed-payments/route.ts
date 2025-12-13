export const runtime = 'edge';
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { calculateMissedPayments } from "@/utils/tenant-payment-calculations";
import { logger } from "@/utils/logger";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    try {
        const supabase = await createSupabaseServerClient();
        const { tenantId } = await params;

        if (!tenantId) {
            return NextResponse.json({ error: "Tenant ID is required." }, { status: 400 });
        }

        // Fetch tenant with apartment details
        const { data: tenant, error: tenantError } = await supabase
            .from('Mieter')
            .select(`
        *,
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
            return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
        }

        // Fetch finances for this tenant's apartment
        // We fetch all finances since move-in to be safe
        // We fetch all finances since the start of the move-in month to be safe
        if (!tenant.einzug) {
            logger.error("Cannot calculate missed payments for tenant without move-in date.", undefined, { tenantId });
            return NextResponse.json({ error: "Tenant move-in date is missing." }, { status: 400 });
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
            return NextResponse.json({ error: "Failed to fetch finances." }, { status: 500 });
        }

        const missedPayments = calculateMissedPayments(tenant, finances || [], true);

        return NextResponse.json({
            missedPayments,
            hasMissingPayments: missedPayments.totalAmount > 0
        });

    } catch (error) {
        logger.error("Error in missed payments API:", error as Error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
