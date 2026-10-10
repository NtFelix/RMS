/** `type` / `template` values sent to the worker; also the metric label allowlist in lib/worker-metrics.ts. */
export const WORKER_REQUEST_TYPES = ['pdf', 'zip', 'csv'] as const;
export const WORKER_TEMPLATES = ['pdf', 'house-overview'] as const;

export type WorkerRequestType = (typeof WORKER_REQUEST_TYPES)[number];
export type WorkerTemplate = (typeof WORKER_TEMPLATES)[number];
