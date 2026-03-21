export const runtime = 'edge'

const POSTHOG_INGEST_HOST = 'https://eu.i.posthog.com'
const POSTHOG_ASSETS_HOST = 'https://eu-assets.i.posthog.com'

function buildTargetUrl(request: Request, pathname: string): URL {
  const baseHost = pathname.startsWith('static/')
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

  const headers = new Headers(request.headers)
  headers.delete('host')

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
