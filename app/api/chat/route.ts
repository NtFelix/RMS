import { NextRequest, NextResponse } from 'next/server';
import { resolveUserAndOrg } from '@/lib/auth-utils';
import { proxyToAiService } from '@/lib/ai-service-proxy';
import { posthogLogger } from '@/lib/posthog-logger';

export async function POST(req: NextRequest) {
  try {
    const { user, orgId, userJwt, errorResponse } = await resolveUserAndOrg(req);
    if (errorResponse) return errorResponse;

    posthogLogger.info('[POST /api/chat] Proxying AI chat request', {
      user_id: user.id,
      org_id: orgId,
    });

    return proxyToAiService('/api/chat', req, user.id, orgId, userJwt);
  } catch (err: any) {
    posthogLogger.error('[POST /api/chat] Internal error', {
      error: err.message || String(err),
    });
    console.error('[POST /api/chat] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
