import { NextRequest, NextResponse } from 'next/server';
import { resolveUserAndOrg } from '@/lib/auth-utils';
import { proxyToAiService } from '@/lib/ai-service-proxy';

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
