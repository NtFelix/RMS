import { NextRequest, NextResponse } from 'next/server';
import { resolveUserAndOrg } from '@/lib/auth-utils';
import { proxyToAiService } from '@/lib/ai-service-proxy';

async function handleRequest(req: NextRequest): Promise<Response> {
  const { user, orgId, errorResponse } = await resolveUserAndOrg(req);
  if (errorResponse) return errorResponse;

  return proxyToAiService('/api/conversations', req, user.id, orgId);
}

export async function GET(req: NextRequest): Promise<Response> {
  try {
    return await handleRequest(req);
  } catch (err: any) {
    console.error('[GET /api/conversations] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    return await handleRequest(req);
  } catch (err: any) {
    console.error('[POST /api/conversations] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
