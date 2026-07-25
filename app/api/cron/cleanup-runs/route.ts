import { NextRequest } from 'next/server';
import { proxyToAiService } from '@/lib/ai-service-proxy';

export async function GET(req: NextRequest) {
  return proxyToAiService('/api/cron/cleanup-runs', req, 'system', 'system');
}

export async function POST(req: NextRequest) {
  return proxyToAiService('/api/cron/cleanup-runs', req, 'system', 'system');
}
