/**
 * Shared OTLP (OpenTelemetry) Utilities
 * 
 * Common functions and constants used by PostHog logging components.
 * Extracted to avoid code duplication between posthog-logger.ts and logging-middleware.ts.
 */

// Types for log attributes
export interface LogAttributes {
    [key: string]: string | number | boolean | string[] | number[] | null | undefined;
}

// Configuration constants
export const SERVICE_NAME = 'mietfluss';
export const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
export const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

/**
 * Get the PostHog logs endpoint from the configured host
 */
export function getLogsEndpoint(): string {
    const host = POSTHOG_HOST.replace(/\/$/, ''); // Remove trailing slash
    return `${host}/i/v1/logs`;
}

/**
 * Convert severity text to OpenTelemetry severity number
 */
export function getSeverityNumber(severity: string): number {
    const map: Record<string, number> = {
        'trace': 1,
        'debug': 5,
        'info': 9,
        'warn': 13,
        'warning': 13,
        'error': 17,
        'fatal': 21,
    };
    return map[severity.toLowerCase()] || 9;
}

/**
 * Format attribute value for OTLP
 */
export function formatAttributeValue(value: unknown): Record<string, unknown> {
    if (typeof value === 'string') {
        return { stringValue: value };
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return { intValue: String(value) };
        }
        return { doubleValue: value };
    }
    if (typeof value === 'boolean') {
        return { boolValue: value };
    }
    if (Array.isArray(value)) {
        return {
            arrayValue: {
                values: value.map(v => formatAttributeValue(v))
            }
        };
    }
    return { stringValue: String(value) };
}

/**
 * Build the resource attributes section for OTLP payload
 */
export function buildResourceAttributes() {
    return [
        { key: 'service.name', value: { stringValue: SERVICE_NAME } },
        { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } },
        { key: 'telemetry.sdk.name', value: { stringValue: 'posthog-logger' } },
        { key: 'telemetry.sdk.version', value: { stringValue: '1.0.0' } },
    ];
}

/**
 * Build OTLP payload for a single log entry
 */
export function buildOTLPPayloadSingle(
    severityText: string,
    message: string,
    attributes: LogAttributes
) {
    const timestamp = new Date().toISOString();
    const cleanAttributes: Record<string, string | number | boolean | string[] | number[]> = {};

    for (const [key, value] of Object.entries(attributes)) {
        if (value !== null && value !== undefined) {
            cleanAttributes[key] = value as string | number | boolean | string[] | number[];
        }
    }

    const enrichedAttributes = {
        ...cleanAttributes,
        'log.timestamp': timestamp,
        'service.name': SERVICE_NAME,
        'environment': process.env.NODE_ENV || 'development',
    };

    return {
        resourceLogs: [{
            resource: {
                attributes: buildResourceAttributes()
            },
            scopeLogs: [{
                scope: { name: SERVICE_NAME, version: '1.0.0' },
                logRecords: [{
                    timeUnixNano: String(new Date(timestamp).getTime() * 1000000),
                    observedTimeUnixNano: String(Date.now() * 1000000),
                    severityNumber: getSeverityNumber(severityText),
                    severityText: severityText.toUpperCase(),
                    body: { stringValue: message },
                    attributes: Object.entries(enrichedAttributes)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([key, value]) => ({
                            key,
                            value: formatAttributeValue(value)
                        }))
                }]
            }]
        }]
    };
}

/**
 * Build OTLP payload for a batch of log entries
 */
export function buildOTLPPayloadBatch(logs: Array<{
    timestamp: string;
    severityText: string;
    body: string;
    attributes: Record<string, unknown>;
}>) {
    return {
        resourceLogs: [{
            resource: {
                attributes: buildResourceAttributes()
            },
            scopeLogs: [{
                scope: { name: SERVICE_NAME, version: '1.0.0' },
                logRecords: logs.map(log => ({
                    timeUnixNano: String(new Date(log.timestamp).getTime() * 1000000),
                    observedTimeUnixNano: String(Date.now() * 1000000),
                    severityNumber: getSeverityNumber(log.severityText),
                    severityText: log.severityText.toUpperCase(),
                    body: { stringValue: log.body },
                    attributes: Object.entries(log.attributes)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([key, value]) => ({
                            key,
                            value: formatAttributeValue(value)
                        }))
                }))
            }]
        }]
    };
}
