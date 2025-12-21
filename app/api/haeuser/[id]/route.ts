export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET specific house by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const { id } = params;

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Haeuser')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`GET /api/haeuser/${id} error:`, error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Haus nicht gefunden.' }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: 'Haus nicht gefunden.' }, { status: 404 });
        }

        return NextResponse.json(data, { status: 200 });
    } catch (e) {
        console.error('Server error GET /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler bei Haeuser-Abfrage.' }, { status: 500 });
    }
}

// PATCH to update house
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const { id } = params;
        const body = await request.json();

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Haeuser')
            .update(body)
            .eq('id', id)
            .select();

        if (error) {
            console.error(`PATCH /api/haeuser/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Haus nicht gefunden.' }, { status: 404 });
        }

        return NextResponse.json(data[0], { status: 200 });
    } catch (e) {
        console.error('Server error PATCH /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler beim Aktualisieren des Hauses.' }, { status: 500 });
    }
}

// PUT to update house
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const { id } = params;
        const body = await request.json();

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Haeuser')
            .update(body)
            .eq('id', id)
            .select();

        if (error) {
            console.error(`PUT /api/haeuser/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Haus nicht gefunden.' }, { status: 404 });
        }

        return NextResponse.json(data[0], { status: 200 });
    } catch (e) {
        console.error('Server error PUT /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler beim Aktualisieren des Hauses.' }, { status: 500 });
    }
}

// DELETE to remove house
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
): Promise<NextResponse> {
    try {
        const { id } = params;

        const supabase = await createClient();
        const { error } = await supabase
            .from('Haeuser')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`DELETE /api/haeuser/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Haus gelöscht' }, { status: 200 });
    } catch (e) {
        console.error('Server error DELETE /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler beim Löschen des Hauses.' }, { status: 500 });
    }
}
