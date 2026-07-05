export const runtime = 'edge';
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";

export async function GET() {
  try {
    const supabase = await createClient();
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const accessibleWohnungIds = await getAccessibleWohnungIds();

    let query = supabase.from('Mieter').select('*');
    if (accessibleWohnungIds !== null) {
      query = query.in('wohnung_id', accessibleWohnungIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('GET /api/mieter error:', error);
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
    console.error('Server error GET /api/mieter:', e);
    return NextResponse.json({ error: 'Serverfehler bei Mieter-Abfrage.' }, { 
      status: 500,
      headers: NO_CACHE_HEADERS 
    });
  }
}

export async function POST(request: Request) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'erstellen');

    const supabase = await createClient();
    const m = await request.json();
    console.error('POST /api/mieter payload:', m);

    if (m.wohnung_id && !(await verifyWohnungInScope(m.wohnung_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    const { data, error } = await supabase.from('Mieter').insert(m).select();
    if (error) {
      console.error('POST /api/mieter error:', error);
      return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { 
        status: 400,
        headers: NO_CACHE_HEADERS 
      });
    }
    return NextResponse.json(data[0], { 
      status: 201,
      headers: NO_CACHE_HEADERS 
    });
  } catch (e) {
    console.error('Server error POST /api/mieter:', e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Erstellen des Mieters.' }, { 
      status,
      headers: NO_CACHE_HEADERS 
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'bearbeiten');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Mieter-ID erforderlich.' }, { 
      status: 400,
      headers: NO_CACHE_HEADERS 
    });

    const supabase = await createClient();
    const m = await request.json();

    // Check scope of existing tenant
    const { data: currentTenant, error: checkError } = await supabase
      .from('Mieter')
      .select('wohnung_id')
      .eq('id', id)
      .single();

    if (checkError || !currentTenant || (currentTenant.wohnung_id && !(await verifyWohnungInScope(currentTenant.wohnung_id)))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    // Check scope of new apartment target
    if (m.wohnung_id && !(await verifyWohnungInScope(m.wohnung_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    const { data, error } = await supabase.from('Mieter').update(m).match({ id }).select();
    if (error) {
      console.error('PUT /api/mieter error:', error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS 
      });
    }
    return NextResponse.json(data[0], { 
      status: 200,
      headers: NO_CACHE_HEADERS 
    });
  } catch (e) {
    console.error('Server error PUT /api/mieter:', e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Aktualisieren des Mieters.' }, { 
      status,
      headers: NO_CACHE_HEADERS 
    });
  }
}

export async function DELETE(request: Request) {
  try {
    const { requireApiPermission, verifyWohnungInScope } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'loeschen');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Mieter-ID erforderlich.' }, { 
      status: 400,
      headers: NO_CACHE_HEADERS 
    });
    const supabase = await createClient();

    // Check scope of existing tenant
    const { data: currentTenant, error: checkError } = await supabase
      .from('Mieter')
      .select('wohnung_id')
      .eq('id', id)
      .single();

    if (checkError || !currentTenant || (currentTenant.wohnung_id && !(await verifyWohnungInScope(currentTenant.wohnung_id)))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: 'Mieter',
      p_record_id: id,
    });
    if (error) {
      console.error('DELETE /api/mieter error:', error);
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS 
      });
    }
    return NextResponse.json({ message: 'Mieter gelöscht' }, { 
      status: 200,
      headers: NO_CACHE_HEADERS 
    });
  } catch (e) {
    console.error('Server error DELETE /api/mieter:', e);
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || 'Serverfehler beim Löschen des Mieters.' }, { 
      status,
      headers: NO_CACHE_HEADERS 
    });
  }
}
