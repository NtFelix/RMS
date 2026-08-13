import { AsyncLocalStorage } from 'node:async_hooks';

// --- Types ---

interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano?: string;
  attributes: { key: string; value: Record<string, unknown> }[];
  status?: { code: number; message?: string };
}

interface Store {
  traceId: string;
  currentSpanId: string;
  spans: Span[];
}

// --- Constants ---

export const SPAN_KINDS = {
  INTERNAL: 1,
  SERVER: 2,
  CLIENT: 3,
} as const;

export const STATUS_CODES = {
  OK: 1,
  ERROR: 2,
} as const;

// --- Module state ---

const als = new AsyncLocalStorage<Store>();
let _env: { POSTHOG_API_KEY?: string; NEXT_PUBLIC_POSTHOG_KEY?: string; POSTHOG_HOST?: string } | null = null;

// --- Helpers ---

function generateId(length: number): string {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateTraceId(): string {
  return generateId(32);
}

function generateSpanId(): string {
  return generateId(16);
}

function getTimestampNano(): string {
  return String(Date.now() * 1_000_000);
}

function formatAttributeValue(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return { intValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') return { boolValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => formatAttributeValue(v)) } };
  }
  return { stringValue: String(value) };
}

function getPostHogApiKey(): string | undefined {
  if (!_env) return undefined;
  const key = _env.POSTHOG_API_KEY;
  if (key && !key.startsWith('phx_')) return key;
  return _env.NEXT_PUBLIC_POSTHOG_KEY;
}

// --- Public API ---

export function initTracing(env: { POSTHOG_API_KEY?: string; NEXT_PUBLIC_POSTHOG_KEY?: string; POSTHOG_HOST?: string }): void {
  _env = env;
}

/**
 * Establish a trace context for the duration of `fn`.
 * All spans created inside `fn` will share the given `traceId`.
 */
export function runWithTrace<T>(traceId: string, fn: () => T): T {
  return als.run({ traceId, currentSpanId: '', spans: [] }, fn);
}

export function startSpan(
  name: string,
  kind: number = SPAN_KINDS.INTERNAL,
  attributes: { key: string; value: Record<string, unknown> }[] = [],
): Span {
  const store = als.getStore();
  const traceId = store?.traceId ?? generateTraceId();
  const spanId = generateSpanId();

  const span: Span = {
    traceId,
    spanId,
    parentSpanId: store?.currentSpanId || undefined,
    name,
    kind,
    startTimeUnixNano: getTimestampNano(),
    attributes: [...attributes],
  };

  if (store) {
    store.currentSpanId = spanId;
    store.spans.push(span);
  }

  return span;
}

export function endSpan(span: Span, status?: { code: number; message?: string }): void {
  span.endTimeUnixNano = getTimestampNano();
  if (status) {
    span.status = status;
  }
  const store = als.getStore();
  if (store) {
    store.currentSpanId = span.parentSpanId || '';
  }
}

export function addSpanAttributes(span: Span, attrs: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(attrs)) {
    span.attributes.push({ key, value: formatAttributeValue(value) });
  }
}

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  kind: number = SPAN_KINDS.INTERNAL,
  attributes: Record<string, unknown> = {},
): Promise<T> {
  const attrList = Object.entries(attributes).map(([key, value]) => ({
    key,
    value: formatAttributeValue(value),
  }));
  const span = startSpan(name, kind, attrList);
  try {
    const result = await fn();
    endSpan(span, { code: STATUS_CODES.OK });
    return result;
  } catch (error) {
    endSpan(span, { code: STATUS_CODES.ERROR, message: (error as Error).message });
    throw error;
  }
}

export function getTraceContext(): { traceId: string; spanId: string } | null {
  const store = als.getStore();
  if (!store) return null;
  return { traceId: store.traceId, spanId: store.currentSpanId };
}

export async function flushSpans(): Promise<void> {
  const store = als.getStore();
  if (!store || store.spans.length === 0) return;

  const completed = store.spans.filter((s) => s.endTimeUnixNano);
  if (completed.length === 0) return;

  store.spans = store.spans.filter((s) => !s.endTimeUnixNano);

  const apiKey = getPostHogApiKey();
  if (!apiKey) return;

  const host = _env?.POSTHOG_HOST || 'https://eu.i.posthog.com';
  const endpoint = `${host.replace(/\/$/, '')}/i/v1/traces`;

  const payload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'backend' } },
            { key: 'deployment.environment', value: { stringValue: 'production' } },
            { key: 'telemetry.sdk.name', value: { stringValue: 'posthog-worker-tracing' } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'backend', version: '1.0.0' },
            spans: completed.map((s) => ({
              traceId: s.traceId,
              spanId: s.spanId,
              parentSpanId: s.parentSpanId,
              name: s.name,
              kind: s.kind,
              startTimeUnixNano: s.startTimeUnixNano,
              endTimeUnixNano: s.endTimeUnixNano!,
              attributes: s.attributes,
              ...(s.status ? { status: s.status } : {}),
            })),
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Could not read body');
      console.error(`[Tracing] Failed to send traces to PostHog: ${res.status} ${res.statusText}`, errorBody);
    }
  } catch (err) {
    console.error('[Tracing] Failed to send traces to PostHog', err);
  }
}
