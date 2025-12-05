/**
 * PostHog Logging Utility
 * 
 * Centralized logging with PostHog integration.
 * Uses console logging in development and OpenTelemetry OTLP in production.
 * 
 * @see https://posthog.com/docs/logs/installation
 */

// Types for log attributes
export interface LogAttributes {
    [key: string]: string | number | boolean | string[] | number[] | null | undefined;
}

// Configuration
const SERVICE_NAME = 'mietfluss';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

// Derive logs endpoint from PostHog host
function getLogsEndpoint(): string {
    const host = POSTHOG_HOST.replace(/\/$/, ''); // Remove trailing slash
    return `${host}/i/v1/logs`;
}

let isInitialized = false;

// Store for batched logs in production
let logBatch: Array<{
    timestamp: string;
    severityText: string;
    body: string;
    attributes: Record<string, unknown>;
}> = [];

let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Send logs to PostHog via OTLP HTTP
 */
async function flushLogs(): Promise<void> {
    if (logBatch.length === 0 || !POSTHOG_API_KEY || !IS_PRODUCTION) {
        return;
    }

    const logsToSend = [...logBatch];
    logBatch = [];

    try {
        const payload = {
            resourceLogs: [{
                resource: {
                    attributes: [
                        { key: 'service.name', value: { stringValue: SERVICE_NAME } },
                        { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV || 'development' } },
                    ]
                },
                scopeLogs: [{
                    scope: { name: SERVICE_NAME },
                    logRecords: logsToSend.map(log => ({
                        timeUnixNano: new Date(log.timestamp).getTime() * 1000000,
                        severityText: log.severityText.toUpperCase(),
                        body: { stringValue: log.body },
                        attributes: Object.entries(log.attributes)
                            .filter(([, v]) => v !== null && v !== undefined)
                            .map(([key, value]) => ({
                                key,
                                value: typeof value === 'string'
                                    ? { stringValue: value }
                                    : typeof value === 'number'
                                        ? { intValue: value }
                                        : typeof value === 'boolean'
                                            ? { boolValue: value }
                                            : { stringValue: String(value) }
                            }))
                    }))
                }]
            }]
        };

        await fetch(getLogsEndpoint(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POSTHOG_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });
    } catch (error) {
        // Silent fail - don't break the app for logging issues
        console.error('[PostHog Logger] Failed to send logs:', error);
    }
}

/**
 * Schedule a flush of logs
 */
function scheduleFlush(): void {
    if (flushTimeout) {
        return;
    }
    flushTimeout = setTimeout(() => {
        flushTimeout = null;
        flushLogs();
    }, 5000); // Flush every 5 seconds
}

/**
 * Initialize the logging system
 */
export function initLogger(): void {
    if (isInitialized) {
        return;
    }

    if (IS_PRODUCTION && POSTHOG_API_KEY) {
        console.log('[PostHog Logger] Initialized with PostHog exporter');
    } else {
        console.log('[PostHog Logger] Initialized with console exporter (development mode)');
    }

    isInitialized = true;
}

/**
 * Base logging function
 */
function log(
    severityText: string,
    message: string,
    attributes: LogAttributes = {}
): void {
    const timestamp = new Date().toISOString();

    // Filter out null/undefined values
    const cleanAttributes: Record<string, string | number | boolean | string[] | number[]> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== null && value !== undefined) {
            cleanAttributes[key] = value as string | number | boolean | string[] | number[];
        }
    }

    // Enrich attributes with common context
    const enrichedAttributes = {
        ...cleanAttributes,
        'log.timestamp': timestamp,
        'service.name': SERVICE_NAME,
        'environment': process.env.NODE_ENV || 'development',
    };

    // In development, log to console
    if (!IS_PRODUCTION) {
        const consoleMethod = severityText === 'error' ? console.error
            : severityText === 'warn' ? console.warn
                : console.log;
        consoleMethod(`[${severityText.toUpperCase()}] ${message}`, enrichedAttributes);
    }

    // In production with API key, batch for sending to PostHog
    if (IS_PRODUCTION && POSTHOG_API_KEY) {
        logBatch.push({
            timestamp,
            severityText,
            body: message,
            attributes: enrichedAttributes,
        });
        scheduleFlush();
    }
}

/**
 * Logger interface with severity-specific methods
 */
export const posthogLogger = {
    /**
     * Log debug-level message (development/troubleshooting)
     */
    debug(message: string, attributes?: LogAttributes): void {
        log('debug', message, attributes);
    },

    /**
     * Log info-level message (general operational information)
     */
    info(message: string, attributes?: LogAttributes): void {
        log('info', message, attributes);
    },

    /**
     * Log warning-level message (potential issues, non-critical)
     */
    warn(message: string, attributes?: LogAttributes): void {
        log('warn', message, attributes);
    },

    /**
     * Log error-level message (errors requiring attention)
     */
    error(message: string, attributes?: LogAttributes): void {
        log('error', message, attributes);
    },

    /**
     * Log with custom severity
     */
    custom(severityText: string, message: string, attributes?: LogAttributes): void {
        log(severityText, message, attributes);
    },

    /**
     * Force flush pending logs (useful before process exit)
     */
    async flush(): Promise<void> {
        await flushLogs();
    },
};

// Re-export for convenience
export { initLogger as initPostHogLogger };
export default posthogLogger;
