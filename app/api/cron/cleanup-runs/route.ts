import { NextRequest, NextResponse } from 'next/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToAiService('/api/cron/cleanup-runs', req, 'system', 'system');
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToAiService('/api/cron/cleanup-runs', req, 'system', 'system');
}
