/**
 * PostHog Logger for Cloudflare Workers
 * 
 * Adapted for the Worker environment where process.env is not available directly
 * and we need to use ctx.waitUntil for async operations.
 */

export interface Env {
    POSTHOG_API_KEY?: string;
    POSTHOG_HOST?: string;
    [key: string]: any;
}

export interface LogAttributes {
    [key: string]: string | number | boolean | string[] | number[] | null | undefined;
}

const SERVICE_NAME = 'backend';

// Helper to format attributes for OTLP
function formatAttributeValue(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'number') {
        if (Number.isInteger(value)) return { intValue: String(value) };
        return { doubleValue: value };
    }
    if (typeof value === 'boolean') return { boolValue: value };
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(v => formatAttributeValue(v)) } };
    }
    return { stringValue: String(value) };
}

function getSeverityNumber(severity: string): number {
    const map: Record<string, number> = {
        'debug': 5,
        'info': 9,
        'warn': 13,
        'error': 17,
    };
    return map[severity.toLowerCase()] || 9;
}

// Minimal interface for Cloudflare Worker ExecutionContext
export interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
}

interface LogRecord {
    timeUnixNano: string;
    severityNumber: number;
    severityText: string;
    body: { stringValue: string };
    attributes: { key: string; value: Record<string, unknown> }[];
}

export class WorkerLogger {
    private logs: LogRecord[] = [];
    private env: Env;
    private ctx: ExecutionContext;

    constructor(env: Env, ctx: ExecutionContext) {
        this.env = env;
        this.ctx = ctx;
    }

    private buildResourceAttributes() {
        return [
            { key: 'service.name', value: { stringValue: SERVICE_NAME } },
            { key: 'deployment.environment', value: { stringValue: 'production' } }, // Workers are usually prod or dev, but valid value needed
            { key: 'telemetry.sdk.name', value: { stringValue: 'posthog-worker-logger' } },
        ];
    }

    log(severity: 'debug' | 'info' | 'warn' | 'error', message: string, attributes: LogAttributes = {}) {
        const apiKey = this.env.POSTHOG_API_KEY;
        if (!apiKey) return;

        const timestamp = new Date().toISOString();

        // Enrich attributes
        const enrichedAttributes = {
            ...attributes,
            'log.timestamp': timestamp,
            'service.name': SERVICE_NAME,
        };

        // Console log for local debugging / real-time logs in dashboard
        console.log(`[${severity.toUpperCase()}] ${message}`, JSON.stringify(attributes));

        this.logs.push({
            timeUnixNano: String(Date.now() * 1000000),
            severityNumber: getSeverityNumber(severity),
            severityText: severity.toUpperCase(),
            body: { stringValue: message },
            attributes: Object.entries(enrichedAttributes)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([key, value]) => ({
                    key,
                    value: formatAttributeValue(value)
                }))
        });
    }

    debug(message: string, attributes?: LogAttributes) { this.log('debug', message, attributes); }
    info(message: string, attributes?: LogAttributes) { this.log('info', message, attributes); }
    warn(message: string, attributes?: LogAttributes) { this.log('warn', message, attributes); }
    error(message: string, attributes?: LogAttributes) { this.log('error', message, attributes); }

    async flush() {
        if (this.logs.length === 0) return;

        const apiKey = this.env.POSTHOG_API_KEY;
        const host = this.env.POSTHOG_HOST || 'https://eu.i.posthog.com';
        const endpoint = `${host.replace(/\/$/, '')}/i/v1/logs`;

        const payload = {
            resourceLogs: [{
                resource: {
                    attributes: this.buildResourceAttributes()
                },
                scopeLogs: [{
                    scope: { name: SERVICE_NAME, version: '1.0.0' },
                    logRecords: this.logs
                }]
            }]
        };

        // Clear logs immediately to avoid double sending if flush called twice
        const logsCount = this.logs.length;
        this.logs = [];

        const promise = fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        }).catch(err => {
            console.error('Failed to send logs to PostHog', err);
        });

        // Use waitUntil if available to ensure logs are sent even if response is already returned
        if (this.ctx && this.ctx.waitUntil) {
            this.ctx.waitUntil(promise);
        } else {
            await promise;
        }
    }
}
