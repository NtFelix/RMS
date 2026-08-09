import { NextResponse } from 'next/server';

function getAiServiceUrl(): string {
  const isDev = process.env.NEXT_PUBLIC_DEV === 'true' || process.env.DEV === 'true' || process.env.NODE_ENV === 'development';
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
  body?: unknown,
  timeoutMs: number = 120000
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

  // Remove headers that shouldn't be forwarded to upstream AI microservice
  headers.delete('authorization');
  headers.delete('cookie');
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    console.log(`[AI Proxy] Upstream ${targetUrl} responded: status=${response.status}, contentType=${contentType}`);

    const filteredHeaders = new Headers(response.headers);
    filteredHeaders.delete('transfer-encoding');
    filteredHeaders.delete('connection');
    filteredHeaders.delete('content-encoding');
    filteredHeaders.delete('content-length');
    filteredHeaders.set('X-Trace-Id', traceId);

    if (contentType.includes('text/event-stream')) {
      filteredHeaders.set('Cache-Control', 'no-cache, no-transform');
      filteredHeaders.set('Connection', 'keep-alive');
      filteredHeaders.set('X-Accel-Buffering', 'no');
      filteredHeaders.set('Content-Type', 'text/event-stream');

      const transformStream = new TransformStream();
      if (response.body) {
        response.body.pipeTo(transformStream.writable).catch((err) => {
          console.error('[AI Proxy] SSE pipe error:', err);
        });
      }
      return new Response(transformStream.readable, {
        status: response.status,
        headers: filteredHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      headers: filteredHeaders,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error(`[AI Proxy] Request timed out for ${targetUrl}`);
      return NextResponse.json(
        { error: 'AI Service request timed out' },
        { status: 504 }
      );
    }
    console.error(`[AI Proxy] Failed to proxy request to ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'AI Service unavailable' },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
