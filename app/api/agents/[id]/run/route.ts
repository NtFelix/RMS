import { NextRequest, NextResponse } from 'next/server';
import { resolveUserAndOrg } from '@/lib/auth-utils';
import { proxyToAiService } from '@/lib/ai-service-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, orgId, userJwt, errorResponse } = await resolveUserAndOrg(req);
    if (errorResponse) return errorResponse;

    return proxyToAiService(`/api/agents/${id}/run`, req, user.id, orgId, userJwt);
  } catch (err: any) {
    console.error('[POST /api/agents/[id]/run] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
