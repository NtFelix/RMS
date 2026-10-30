/** `type` / `template` values sent to the worker; also the metric label allowlist in lib/worker-metrics.ts. */
export const WORKER_REQUEST_TYPES = ['pdf', 'zip', 'csv'] as const;
export const WORKER_TEMPLATES = ['pdf', 'house-overview'] as const;

export type WorkerRequestType = (typeof WORKER_REQUEST_TYPES)[number];
export type WorkerTemplate = (typeof WORKER_TEMPLATES)[number];

/**
 * Templates that only a dedicated server route may request, with its own checks and the shared key (the deposit statement,
 * `app/api/kautionen/abrechnung/route.ts`). The generic proxy `app/api/worker/route.ts` adds the shared key to every call
 * of a signed-in user, so it must refuse these: otherwise any user could send forged figures to the worker.
 */
export const WORKER_KAUTION_ABRECHNUNG_TEMPLATE = 'kaution-abrechnung';
export const WORKER_INTERNAL_ONLY_TEMPLATES = [WORKER_KAUTION_ABRECHNUNG_TEMPLATE] as const;
