import { NextRequest, NextResponse } from 'next/server';
import { resolveUserAndOrg } from '@/lib/auth-utils';
import { proxyToAiService } from '@/lib/ai-service-proxy';

export async function GET(req: NextRequest) {
  try {
    const { user, orgId, userJwt, errorResponse } = await resolveUserAndOrg(req);
    if (errorResponse) return errorResponse;

    return proxyToAiService('/api/agents/runs', req, user.id, orgId, userJwt);
  } catch (err: any) {
    console.error('[GET /api/agents/runs] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
