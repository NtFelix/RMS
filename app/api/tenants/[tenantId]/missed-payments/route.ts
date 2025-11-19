export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { calculateMissedPayments } from "@/utils/tenant-payment-calculations";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    try {
        const supabase = await createClient();
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
        const moveInDate = tenant.einzug ? new Date(tenant.einzug) : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
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

        const missedPayments = calculateMissedPayments(tenant, finances || []);

        return NextResponse.json({
            missedPayments,
            hasMissingPayments: missedPayments.totalAmount > 0
        });

    } catch (error) {
        console.error("Error in missed payments API:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
