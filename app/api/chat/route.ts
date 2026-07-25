import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

export async function POST(req: NextRequest) {
  try {
    const userSupabase = await createClient();
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { session } } = await userSupabase.auth.getSession();
    const userJwt = session?.access_token;

    let orgId = req.headers.get('X-Org-Id');
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

    return proxyToAiService('/api/chat', req, user.id, orgId, userJwt);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
