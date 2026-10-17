import posthogProxyConfig from '@/lib/posthog-proxy'


const { POSTHOG_INGEST_HOST, POSTHOG_ASSETS_HOST } = posthogProxyConfig

function buildTargetUrl(request: Request, pathname: string): URL {
  const baseHost = pathname.startsWith('static/') || pathname.startsWith('array/')
    ? POSTHOG_ASSETS_HOST
    : POSTHOG_INGEST_HOST

  const targetUrl = new URL(`/${pathname}`, baseHost)
  const incomingUrl = new URL(request.url)
  targetUrl.search = incomingUrl.search

  return targetUrl
}

async function proxy(request: Request, paramsPromise: Promise<{ path: string[] }>) {
  const { path } = await paramsPromise
  const pathname = path?.join('/') ?? ''
  const targetUrl = buildTargetUrl(request, pathname)

  const allowedHeaders = [
    'accept',
    'accept-encoding',
    'accept-language',
    'authorization',
    'cache-control',
    'content-type',
    'content-length',
    'if-none-match',
    'if-modified-since',
    'origin',
    'pragma',
    'referer',
    'user-agent',
    'x-conversations-token',
    'x-widget-session-id',
    'x-posthog-token',
    'x-requested-with',
  ]
  const headers = new Headers()
  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase()
    if (allowedHeaders.includes(lowerKey) || lowerKey.startsWith('x-')) {
      headers.set(key, value)
    }
  }

  const method = request.method
  const hasBody = method !== 'GET' && method !== 'HEAD'

  const proxyRequest = new Request(targetUrl.toString(), {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  })

  return fetch(proxyRequest)
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function OPTIONS(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}

export async function HEAD(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params)
}
