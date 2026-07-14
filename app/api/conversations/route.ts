import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let orgId = searchParams.get('orgId');

    // Auto-resolve organization if not passed
    if (!orgId) {
      const { data: rpcOrgId } = await userSupabase.rpc('current_organisation_id');
      orgId = rpcOrgId;
    }

    if (!orgId) {
      const { data: membership } = await userSupabase
        .from('Organisation_Mitglieder')
        .select('organisation_id')
        .eq('user_id', user.id)
        .eq('status', 'aktiv')
        .limit(1)
        .maybeSingle();
      orgId = membership?.organisation_id || null;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
    }

    // Load active, non-deleted conversations sorted by last access descending
    const { data, error } = await userSupabase
      .from('KI_Konversationen')
      .select('id, titel, letzter_zugriff, status')
      .eq('organisation_id', orgId)
      .eq('status', 'aktiv')
      .is('geloescht_am', null)
      .order('letzter_zugriff', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let { orgId, titel } = body;

    // Auto-resolve organization if not passed
    if (!orgId) {
      const { data: rpcOrgId } = await userSupabase.rpc('current_organisation_id');
      orgId = rpcOrgId;
    }

    if (!orgId) {
      const { data: membership } = await userSupabase
        .from('Organisation_Mitglieder')
        .select('organisation_id')
        .eq('user_id', user.id)
        .eq('status', 'aktiv')
        .limit(1)
        .maybeSingle();
      orgId = membership?.organisation_id || null;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'No active organization found' }, { status: 400 });
    }

    // Resolve user's membership ID
    const { data: member, error: memberError } = await userSupabase
      .from('Organisation_Mitglieder')
      .select('id')
      .eq('user_id', user.id)
      .eq('organisation_id', orgId)
      .eq('status', 'aktiv')
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden: You are not a member of this organization' }, { status: 403 });
    }

    // Create new conversation
    const { data, error } = await userSupabase
      .from('KI_Konversationen')
      .insert({
        organisation_id: orgId,
        mitglied_id: member.id,
        agent_id: null,
        titel: titel || 'Neue Konversation',
        status: 'aktiv',
        storage_status: 'db',
        erstellt_von: user.id
      })
      .select('id')
      .single();

    if (error) {
      console.error('[conversations POST database error]:', error);
      return NextResponse.json({ error: error.message || 'Database error', details: error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[conversations POST exception]:', err);
    const message = err instanceof Error ? err.message : (err && typeof err === 'object' ? JSON.stringify(err) : String(err));
    const stack = err instanceof Error ? err.stack : null;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
