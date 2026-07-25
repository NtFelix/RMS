import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

async function resolveUserAndOrg(req: NextRequest): Promise<{ user: any; orgId: string; errorResponse: Response | null }> {
  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return { user: null, orgId: '', errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { searchParams } = new URL(req.url);
  let orgId = searchParams.get('orgId');

  if (!orgId) {
    const { data: rpcOrgId } = await authClient.rpc('current_organisation_id');
    orgId = rpcOrgId;
  }

  if (!orgId) {
    const { data: membership } = await authClient
      .from('Organisation_Mitglieder')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('status', 'aktiv')
      .limit(1)
      .maybeSingle();
    orgId = membership?.organisation_id || null;
  }

  if (!orgId) {
    return { user: null, orgId: '', errorResponse: NextResponse.json({ error: 'No active organization found' }, { status: 400 }) };
  }

  return { user, orgId, errorResponse: null };
}

export async function GET(req: NextRequest): Promise<Response> {
  const { user, orgId, errorResponse } = await resolveUserAndOrg(req);
  if (errorResponse) return errorResponse;

  return proxyToAiService('/api/conversations', req, user.id, orgId);
}

export async function POST(req: NextRequest): Promise<Response> {
  const { user, orgId, errorResponse } = await resolveUserAndOrg(req);
  if (errorResponse) return errorResponse;

  return proxyToAiService('/api/conversations', req, user.id, orgId);
}
