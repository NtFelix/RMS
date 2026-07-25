import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

async function resolveUserAndOrg(): Promise<{ user: any; orgId: string; errorResponse: Response | null }> {
  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    return { user: null, orgId: '', errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: rpcOrgId } = await authClient.rpc('current_organisation_id');
  let orgId = rpcOrgId;

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const { user, orgId, errorResponse } = await resolveUserAndOrg();
  if (errorResponse) return errorResponse;

  return proxyToAiService(`/api/conversations/${id}`, req, user.id, orgId);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const { user, orgId, errorResponse } = await resolveUserAndOrg();
  if (errorResponse) return errorResponse;

  return proxyToAiService(`/api/conversations/${id}`, req, user.id, orgId);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const { user, orgId, errorResponse } = await resolveUserAndOrg();
  if (errorResponse) return errorResponse;

  return proxyToAiService(`/api/conversations/${id}`, req, user.id, orgId);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const { user, orgId, errorResponse } = await resolveUserAndOrg();
  if (errorResponse) return errorResponse;

  return proxyToAiService(`/api/conversations/${id}`, req, user.id, orgId);
}
