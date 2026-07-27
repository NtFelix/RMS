import { NextResponse } from 'next/server';

function getAiServiceUrl(): string {
  const isDev = process.env.DEV === 'true';
  if (isDev) {
    return process.env.DEV_AI_SERVICE_URL || process.env.AI_SERVICE_URL || 'http://localhost:8080';
  }
  return process.env.AI_SERVICE_URL || 'https://ai.mietevo.de';
}

function getAiServiceSecret(): string | undefined {
  return process.env.AI_SERVICE_AUTH_SECRET;
}

export async function proxyToAiService(
  path: string,
  request: Request,
  userId: string,
  orgId: string,
  userJwt?: string,
  body?: unknown
): Promise<Response> {
  const baseUrl = getAiServiceUrl();
  console.log(`[AI Proxy] Proxying ${request.method} ${path} to ${baseUrl}${path} (user: ${userId}, org: ${orgId})`);
  const headers = new Headers(request.headers);

  const secret = getAiServiceSecret();
  if (secret) {
    headers.set('X-AI-Service-Auth', secret);
  }
  headers.set('X-User-Id', userId);
  headers.set('X-Org-Id', orgId);
  if (userJwt) {
    headers.set('X-User-Jwt', userJwt);
  }

  const existingTraceId = headers.get('x-trace-id') || headers.get('x-posthog-trace-id') || headers.get('x-request-id');
  const traceId = existingTraceId || crypto.randomUUID();
  headers.set('X-Trace-Id', traceId);

  // Remove original auth headers (JWT/Cookie)
  headers.delete('authorization');
  headers.delete('cookie');

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (body !== undefined) {
      fetchOptions.body = JSON.stringify(body);
      headers.set('Content-Type', 'application/json');
    } else {
      fetchOptions.body = await request.text();
    }
  }

  const targetUrl = `${baseUrl}${path}`;

  try {
    const response = await fetch(targetUrl, fetchOptions);

    const filteredHeaders = new Headers(response.headers);
    filteredHeaders.delete('transfer-encoding');
    filteredHeaders.delete('connection');
    filteredHeaders.delete('content-encoding');
    filteredHeaders.delete('content-length');
    filteredHeaders.set('X-Trace-Id', traceId);

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (err: any) {
    console.error(`[AI Proxy] Failed to proxy request to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'AI Service unavailable' },
      { status: 502 }
    );
  }
}
