import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import {
  MIETER_LESE_SELECT,
  bewerberEingabeAusMieterEingabe,
  fehlerAusRpc,
  istEingabeObjekt,
  mieterEingabeAusBody,
  personEingabeAusBody,
} from "@/lib/mieter-schreibpfad";
import { mitPersonenfeldern, type Person } from "@/lib/personen";

/** Zeile aus "Mieter" mit eingebetteter Person, vor dem Abbilden auf name/email/telefonnummer. */
type MieterZeile = { person?: Person | Person[] | null };

export async function GET() {
  try {
    // Tenant names and data only for users who may see tenants (as the Mieter page does)
    const { requireApiPermission } = await import("@/lib/api-permissions");
    await requireApiPermission('mieter', 'ansehen');

    const supabase = await createSupabaseServerClient();
    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const accessibleWohnungIds = await getAccessibleWohnungIds();

    // Explizite Spaltenliste ohne das Altfeld "kaution" und ohne Personenfelder (GH-30: Person eingebettet).
    let query = supabase.from('Mieter').select(MIETER_LESE_SELECT);
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
    const zeilen = ((data ?? []) as unknown as MieterZeile[]).map((zeile) => mitPersonenfeldern(zeile));
    return NextResponse.json(zeilen, { 
      status: 200,
      headers: NO_CACHE_HEADERS 
    });
  } catch (e) {
    console.error('Server error GET /api/mieter:', e);
    // 403 PERMISSION_DENIED (right missing) or 503 PERMISSION_CHECK_FAILED (the check itself failed)
    const permissionResponse = apiPermissionErrorResponse(e);
    if (permissionResponse) return permissionResponse;
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

    const body = await request.json();
    if (!istEingabeObjekt(body)) {
      return NextResponse.json({ error: "Ungültiger Request-Body." }, {
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }

    const supabase = await createSupabaseServerClient();
    // Personenfelder gehen an die RPC (Person wird neu angelegt); Mieterfelder nur mit Whitelist.
    // Das Altfeld "kaution" und Systemfelder werden verworfen.
    const person = personEingabeAusBody(body, "anlegen");
    const mieter = mieterEingabeAusBody(body);

    if (typeof mieter.wohnung_id === "string" && !(await verifyWohnungInScope(mieter.wohnung_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    // status "bewerber" legt einen Bewerber an (Tabelle "Bewerber"), sonst einen Mieter.
    if (body.status === 'bewerber') {
      const { data, error } = await supabase.rpc('bewerber_anlegen', {
        p_person: person,
        p_bewerber: bewerberEingabeAusMieterEingabe(mieter),
      });
      if (error) {
        console.error('POST /api/mieter bewerber_anlegen error:', error.code);
        const fehler = fehlerAusRpc(error);
        return NextResponse.json({ error: fehler.message, code: error.code }, { status: fehler.status, headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json(data, { status: 201, headers: NO_CACHE_HEADERS });
    }

    const { data, error } = await supabase.rpc('mieter_anlegen', { p_person: person, p_mieter: mieter });
    if (error) {
      console.error('POST /api/mieter error:', error.code);
      const fehler = fehlerAusRpc(error);
      return NextResponse.json({ error: fehler.message, code: error.code }, { 
        status: fehler.status,
        headers: NO_CACHE_HEADERS 
      });
    }

    const mieterId = (data as { mieter_id?: string } | null)?.mieter_id;
    const { data: zeile, error: leseFehler } = await supabase
      .from('Mieter')
      .select(MIETER_LESE_SELECT)
      .eq('id', mieterId as string)
      .single();
    if (leseFehler || !zeile) {
      console.error('POST /api/mieter read-back error:', leseFehler?.code);
      return NextResponse.json({ error: 'Mieter wurde angelegt, konnte aber nicht gelesen werden.' }, { status: 500, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json(mitPersonenfeldern(zeile as unknown as MieterZeile), { 
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

    const body = await request.json();
    if (!istEingabeObjekt(body)) {
      return NextResponse.json({ error: 'Ungültiger Request-Body.' }, {
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }
    const person = personEingabeAusBody(body, "aendern");
    const mieter = mieterEingabeAusBody(body);
    if (Object.keys(person).length === 0 && Object.keys(mieter).length === 0) {
      return NextResponse.json({ error: 'Keine änderbaren Felder angegeben.' }, {
        status: 400,
        headers: NO_CACHE_HEADERS
      });
    }

    const supabase = await createSupabaseServerClient();

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
    if (typeof mieter.wohnung_id === 'string' && !(await verifyWohnungInScope(mieter.wohnung_id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS 
      });
    }

    const { error } = await supabase.rpc('mieter_aktualisieren', {
      p_mieter_id: id,
      p_person: person,
      p_mieter: mieter,
    });
    if (error) {
      console.error('PUT /api/mieter error:', error.code);
      const fehler = fehlerAusRpc(error);
      return NextResponse.json({ error: fehler.message }, { 
        status: fehler.status,
        headers: NO_CACHE_HEADERS 
      });
    }

    const { data: zeile, error: leseFehler } = await supabase
      .from('Mieter')
      .select(MIETER_LESE_SELECT)
      .eq('id', id)
      .single();
    if (leseFehler || !zeile) {
      return NextResponse.json({ error: 'Mieter nicht gefunden.' }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json(mitPersonenfeldern(zeile as unknown as MieterZeile), { 
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
    const supabase = await createSupabaseServerClient();

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
