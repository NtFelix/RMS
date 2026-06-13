export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

// GET specific house by ID
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Haeuser')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`GET /api/haeuser/${id} error:`, error);
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Haus nicht gefunden.' }, { 
                    status: 404,
                    headers: NO_CACHE_HEADERS
                });
            }
            return NextResponse.json({ error: error.message }, { 
                status: 500,
                headers: NO_CACHE_HEADERS
            });
        }

        return NextResponse.json(data, { 
            status: 200,
            headers: NO_CACHE_HEADERS
        });
    } catch (e) {
        console.error('Server error GET /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler bei Haeuser-Abfrage.' }, { 
            status: 500,
            headers: NO_CACHE_HEADERS
        });
    }
}

// PATCH to update house
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;
        const body = await request.json();

        const supabase = await createClient();
        const { data, error } = await supabase
            .from('Haeuser')
            .update(body)
            .eq('id', id)
            .select();

        if (error) {
            console.error(`PATCH /api/haeuser/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { 
                status: 400,
                headers: NO_CACHE_HEADERS
            });
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ error: 'Haus nicht gefunden.' }, { 
                status: 404,
                headers: NO_CACHE_HEADERS
            });
        }

        return NextResponse.json(data[0], { 
            status: 200,
            headers: NO_CACHE_HEADERS
        });
    } catch (e) {
        console.error('Server error PATCH /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler beim Aktualisieren des Hauses.' }, { 
            status: 500,
            headers: NO_CACHE_HEADERS
        });
    }
}

// PUT to update house
export const PUT = PATCH;

// DELETE to remove house
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    try {
        const { id } = await params;

        const supabase = await createClient();
        const { error } = await supabase
            .from('Haeuser')
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`DELETE /api/haeuser/${id} error:`, error);
            return NextResponse.json({ error: error.message }, { 
                status: 500,
                headers: NO_CACHE_HEADERS
            });
        }

        return NextResponse.json({ message: 'Haus gelöscht' }, { 
            status: 200,
            headers: NO_CACHE_HEADERS
        });
    } catch (e) {
        console.error('Server error DELETE /api/haeuser/[id]:', e);
        return NextResponse.json({ error: 'Serverfehler beim Löschen des Hauses.' }, { 
            status: 500,
            headers: NO_CACHE_HEADERS
        });
    }
}
