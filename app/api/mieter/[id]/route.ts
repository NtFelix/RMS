import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import {
    MIETER_LESE_SELECT,
    fehlerAusRpc,
    istEingabeObjekt,
    mieterEingabeAusBody,
    personEingabeAusBody,
} from "@/lib/mieter-schreibpfad";
import { mitPersonenfeldern, type Person } from "@/lib/personen";

/** Zeile aus "Mieter" mit eingebetteter Person, vor dem Abbilden auf name/email/telefonnummer. */
type MieterZeile = { person?: Person | Person[] | null };

// GET specific tenant by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;

        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('Mieter')
            // Explizite Spaltenliste ohne das Altfeld "kaution" und ohne Personenfelder (GH-30: Person eingebettet).
            .select(`${MIETER_LESE_SELECT}, Wohnungen(id, name)`)
            .eq('id', id)
            .single();

        if (error) {
            console.error('GET /api/mieter/%s error:', id, error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Mieter nicht gefunden.' }, { status: 404, headers: NO_CACHE_HEADERS });
            }
            return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        const { verifyWohnungInScope } = await import("@/lib/api-permissions");
        if (data.wohnung_id && !(await verifyWohnungInScope(data.wohnung_id))) {
            return NextResponse.json({ error: 'Permission denied' }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(mitPersonenfeldern(data as unknown as MieterZeile), { status: 200, headers: NO_CACHE_HEADERS });
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

        // Personenfelder und Mieterfelder getrennt übernehmen; das Altfeld "kaution" wird verworfen.
        const body = await request.json();
        if (!istEingabeObjekt(body)) {
            return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400, headers: NO_CACHE_HEADERS });
        }
        const person = personEingabeAusBody(body);
        const mieter = mieterEingabeAusBody(body);
        if (Object.keys(person).length === 0 && Object.keys(mieter).length === 0) {
            return NextResponse.json({ error: 'Keine änderbaren Felder angegeben.' }, { status: 400, headers: NO_CACHE_HEADERS });
        }
        const supabase = await createSupabaseServerClient();

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
        if (typeof mieter.wohnung_id === 'string' && !(await verifyWohnungInScope(mieter.wohnung_id))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        const { error } = await supabase.rpc('mieter_aktualisieren', {
            p_mieter_id: id,
            p_person: person,
            p_mieter: mieter,
        });
        if (error) {
            console.error('PATCH /api/mieter/%s error:', id, error.code);
            const fehler = fehlerAusRpc(error);
            return NextResponse.json({ error: fehler.message }, { status: fehler.status, headers: NO_CACHE_HEADERS });
        }

        const { data, error: leseFehler } = await supabase
            .from('Mieter')
            .select(MIETER_LESE_SELECT)
            .eq('id', id)
            .single();
        if (leseFehler || !data) {
            return NextResponse.json({ error: 'Mieter nicht gefunden.' }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(mitPersonenfeldern(data as unknown as MieterZeile), { status: 200, headers: NO_CACHE_HEADERS });
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

        const supabase = await createSupabaseServerClient();

        // Check scope of existing tenant
        const { data: currentTenant, error: checkError } = await supabase
            .from('Mieter')
            .select('wohnung_id')
            .eq('id', id)
            .single();

        if (checkError || !currentTenant || (currentTenant.wohnung_id && !(await verifyWohnungInScope(currentTenant.wohnung_id)))) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403, headers: NO_CACHE_HEADERS });
        }

        const { error } = await supabase.rpc('soft_delete_record', {
            p_table_name: 'Mieter',
            p_record_id: id,
        });

        if (error) {
            console.error('DELETE /api/mieter/%s error:', id, error);
            return NextResponse.json({ error: error.message }, { status: 500, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json({ message: 'Mieter gelöscht' }, { status: 200, headers: NO_CACHE_HEADERS });
    } catch (e) {
        console.error('Server error DELETE /api/mieter/[id]:', e);
        const status = (e as Error).message === 'Permission denied' ? 403 : 500
        return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Löschen des Mieters.' }, { status, headers: NO_CACHE_HEADERS });
    }
}
