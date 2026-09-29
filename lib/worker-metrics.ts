/**
 * PostHog metrics for calls to the Cloudflare backend worker (see app/api/worker/route.ts).
 *
 * The worker reports its own PDF generation time and page count in the
 * X-PDF-Generation-Time / X-PDF-Page-Count response headers, so it needs no changes.
 */

import { count, histogram } from './posthog-metrics';
import { WORKER_REQUEST_TYPES, WORKER_TEMPLATES } from './worker-client';

// Labels come from the request body, so only known values are passed through:
// this keeps cardinality bounded and never puts user input into attributes.
function label(value: unknown, allowed: readonly string[]): string {
    if (value === undefined || value === null) return 'none';
    return typeof value === 'string' && allowed.includes(value) ? value : 'other';
}

function headerNumber(response: Response, name: string): number | undefined {
    const raw = response.headers.get(name);
    if (raw === null) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
}

/** Record one worker call. Omit `response` when the request failed before the worker answered. */
export function recordWorkerCall(
    body: { type?: unknown; template?: unknown } | null | undefined,
    roundTripMs: number,
    response?: Response,
): void {
    const labels = { type: label(body?.type, WORKER_REQUEST_TYPES), template: label(body?.template, WORKER_TEMPLATES) };
    const attrs = { ...labels, status: response?.ok ? 'ok' : 'error' };

    count('worker.requests', 1, attrs);
    histogram('worker.request.duration', roundTripMs, attrs, 'ms');

    if (!response) return;

    const generationMs = headerNumber(response, 'X-PDF-Generation-Time');
    if (generationMs !== undefined) {
        histogram('worker.pdf.generation.duration', generationMs, labels, 'ms');
    }
    // The worker sends "0" for non-PDF responses (CSV, ZIP), which would only skew the distribution.
    const pages = headerNumber(response, 'X-PDF-Page-Count');
    if (pages !== undefined && pages > 0) {
        histogram('worker.pdf.pages', pages, labels, 'pages');
    }
}
