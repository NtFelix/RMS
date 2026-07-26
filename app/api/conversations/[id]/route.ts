import { type User } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

type ResolveResult = { user: User; orgId: string; errorResponse: null } | { user: null; orgId: ''; errorResponse: Response };

async function resolveUserAndOrg(req?: NextRequest): Promise<ResolveResult> {
  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();

  if (authError || !user) {
    if (req) {
      console.error('[resolveUserAndOrg] Auth failed:', {
        authError: authError?.message || authError,
        hasUser: !!user,
        cookies: req.cookies.getAll().map(c => c.name),
      });
    }
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

async function handleRequest(
  req: NextRequest,
  params: Promise<{ id: string }>,
  pathSuffix: string
): Promise<Response> {
  const { id } = await params;
  const { user, orgId, errorResponse } = await resolveUserAndOrg(req);
  if (errorResponse) return errorResponse;

  return proxyToAiService(`/api/conversations/${id}${pathSuffix}`, req, user.id, orgId);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    return await handleRequest(req, params, '');
  } catch (err: any) {
    console.error('[GET /api/conversations/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    return await handleRequest(req, params, '');
  } catch (err: any) {
    console.error('[POST /api/conversations/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    return await handleRequest(req, params, '');
  } catch (err: any) {
    console.error('[PATCH /api/conversations/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    return await handleRequest(req, params, '');
  } catch (err: any) {
    console.error('[DELETE /api/conversations/[id]] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
