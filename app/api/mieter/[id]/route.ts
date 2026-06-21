export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

// GET specific tenant by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Mieter')
            .select('*, Wohnungen(id, name)')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`GET /api/mieter/${id} error:`, error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Mieter nicht gefunden.' }, { status: 404, headers: NO_CACHE_HEADERS });
            }
            return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        const { verifyWohnungInScope } = await import("@/lib/api-permissions");
        if (data.wohnung_id && !(await verifyWohnungInScope(data.wohnung_id))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(data, { status: 200, headers: NO_CACHE_HEADERS });
    } catch (e) {
        console.error('Server error GET /api/mieter/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler bei Mieter-Abfrage.' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}

// PATCH to update tenant
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;
        const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
        await requireApiPermission('mieter', 'bearbeiten');

        const body = await request.json();
        const supabase = await createClient();

        // Check scope of existing tenant
        const { data: currentTenant, error: checkError } = await supabase
            .from('Mieter')
            .select('wohnung_id')
            .eq('id', id)
            .single();

        if (checkError || !currentTenant || (currentTenant.wohnung_id && !(await verifyWohnungInScope(currentTenant.wohnung_id)))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        // Check scope of new apartment if changing
        if (body.wohnung_id && !(await verifyWohnungInScope(body.wohnung_id))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        const { data, error } = await supabase
            .from('Mieter')
            .update(body)
            .eq('id', id)
            .select();

        if (error) {
            console.error(`PATCH /api/mieter/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { status: 400, headers: NO_CACHE_HEADERS });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Mieter nicht gefunden.' }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(data[0], { status: 200, headers: NO_CACHE_HEADERS });
    } catch (e) {
        console.error('Server error PATCH /api/mieter/[id]:', e);
        const status = (e as Error).message === 'Permission denied' ? 403 : 500
        return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Aktualisieren des Mieters.' }, { status, headers: NO_CACHE_HEADERS });
    }
}

// PUT to update tenant
export const PUT = PATCH;

// DELETE to remove tenant
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;
        const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
        await requireApiPermission('mieter', 'loeschen');

        const supabase = await createClient();

        // Check scope of existing tenant
        const { data: currentTenant, error: checkError } = await supabase
            .from('Mieter')
            .select('wohnung_id')
            .eq('id', id)
            .single();

        if (checkError || !currentTenant || (currentTenant.wohnung_id && !(await verifyWohnungInScope(currentTenant.wohnung_id)))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        const { error } = await supabase
            .from('Mieter')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`DELETE /api/mieter/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json({ message: 'Mieter gelöscht' }, { status: 200, headers: NO_CACHE_HEADERS });
    } catch (e) {
        console.error('Server error DELETE /api/mieter/[id]:', e);
        const status = (e as Error).message === 'Permission denied' ? 403 : 500
        return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Löschen des Mieters.' }, { status, headers: NO_CACHE_HEADERS });
    }
}
