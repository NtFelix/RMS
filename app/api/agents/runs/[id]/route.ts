import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rpcOrgId } = await supabase.rpc('current_organisation_id');
    let orgId = rpcOrgId;

    if (!orgId) {
      const { data: membership } = await supabase
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

    return proxyToAiService(`/api/agents/runs/${id}`, req, user.id, orgId);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
