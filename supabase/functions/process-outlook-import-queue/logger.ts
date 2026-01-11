/**
 * PostHog Logging Utility for Supabase Edge Functions (Deno)
 * 
 * Self-contained logging module for edge functions.
 * Uses OpenTelemetry OTLP format to send logs to PostHog.
 */

// Configuration from environment
const POSTHOG_API_KEY = Deno.env.get('POSTHOG_API_KEY');
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST') || 'https://eu.i.posthog.com';
const SERVICE_NAME = 'mietevo-edge-functions';
const DEBUG_MODE = Deno.env.get('POSTHOG_LOGS_DEBUG') === 'true';
const SHOULD_SEND_TO_POSTHOG = !!POSTHOG_API_KEY;
const IS_PRODUCTION = !!Deno.env.get('DENO_DEPLOYMENT_ID');

// Types
export interface LogAttributes {
    [key: string]: string | number | boolean | string[] | number[] | null | undefined;
}

interface LogEntry {
    timestamp: string;
    severityText: string;
    body: string;
    attributes: Record<string, unknown>;
}

export interface ActionResult<T> {
    success: boolean;
    error?: { message: string } | any;
    data?: T;
    [key: string]: any;
}

export interface LogContext {
    userId?: string;
    requestId?: string;
    path?: string;
    method?: string;
    [key: string]: any;
}

// Store for batched logs
let logBatch: LogEntry[] = [];

/**
 * Get the PostHog logs endpoint (OpenTelemetry OTLP HTTP)
 * Endpoint format per docs: https://posthog.com/docs/logs/installation/other
 */
function getLogsEndpoint(): string {
    return `${POSTHOG_HOST}/i/v1/logs`;
}

/**
 * Debug logging helper
 */
function debugLog(...args: unknown[]): void {
    if (DEBUG_MODE) {
        console.log('[PostHog Logger DEBUG]', ...args);
    }
}

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sanitize sensitive data from log attributes
 */
export function sanitizeAttributes(attributes: Record<string, any>): LogAttributes {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit_card', 'ssn', 'refresh_token', 'access_token'];
    const sanitized: LogAttributes = {};

    for (const [key, value] of Object.entries(attributes)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = `[Object: ${Object.keys(value).length} keys]`;
        } else if (typeof value === 'string' && value.length > 200) {
            sanitized[key] = `${value.substring(0, 200)}... [truncated]`;
        } else if (['string', 'number', 'boolean'].includes(typeof value)) {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Build OTLP payload for batch of logs
 */
function buildOTLPPayloadBatch(logs: LogEntry[]): object {
    const resourceLogs = {
        resource: {
            attributes: [
                { key: 'service.name', value: { stringValue: SERVICE_NAME } },
                { key: 'deployment.environment', value: { stringValue: IS_PRODUCTION ? 'production' : 'development' } },
            ],
        },
        scopeLogs: [
            {
                scope: {
                    name: SERVICE_NAME,
                    version: '1.0.0',
                },
                logRecords: logs.map((log) => {
                    const severityMap: Record<string, number> = {
                        trace: 1, debug: 5, info: 9, warn: 13, error: 17, fatal: 21,
                    };

                    const attributesList = Object.entries(log.attributes).map(([key, value]) => {
                        if (typeof value === 'string') {
                            return { key, value: { stringValue: value } };
                        } else if (typeof value === 'number') {
                            return Number.isInteger(value)
                                ? { key, value: { intValue: value } }
                                : { key, value: { doubleValue: value } };
                        } else if (typeof value === 'boolean') {
                            return { key, value: { boolValue: value } };
                        } else if (Array.isArray(value)) {
                            return {
                                key,
                                value: {
                                    arrayValue: {
                                        values: value.map((v) =>
                                            typeof v === 'string' ? { stringValue: v } : { intValue: v }
                                        ),
                                    },
                                },
                            };
                        }
                        return { key, value: { stringValue: String(value) } };
                    });

                    return {
                        timeUnixNano: String(new Date(log.timestamp).getTime() * 1_000_000),
                        severityNumber: severityMap[log.severityText.toLowerCase()] || 9,
                        severityText: log.severityText.toUpperCase(),
                        body: { stringValue: log.body },
                        attributes: attributesList,
                    };
                }),
            },
        ],
    };

    return { resourceLogs: [resourceLogs] };
}

/**
 * Flush all queued logs to PostHog
 */
export async function flushLogs(): Promise<void> {
    if (logBatch.length === 0) {
        debugLog('No logs to flush');
        return;
    }

    if (!SHOULD_SEND_TO_POSTHOG) {
        debugLog('Skipping flush - POSTHOG_API_KEY not configured');
        logBatch = [];
        return;
    }

    const logsToSend = [...logBatch];
    logBatch = [];

    const endpoint = getLogsEndpoint();
    const payload = buildOTLPPayloadBatch(logsToSend);

    debugLog(`Flushing ${logsToSend.length} logs to ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POSTHOG_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            debugLog(`✅ Successfully sent ${logsToSend.length} logs to PostHog`);
        } else {
            const errorBody = await response.text().catch(() => 'Could not read response');
            console.error(`[PostHog Logger] ❌ Failed to send logs: ${response.status}`, errorBody);
        }
    } catch (error) {
        console.error('[PostHog Logger] ❌ Network error:', error);
    }
}

/**
 * Base logging function - queues log for sending
 */
function log(severityText: string, message: string, attributes: LogAttributes = {}): void {
    const timestamp = new Date().toISOString();

    const cleanAttributes: Record<string, any> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (value !== null && value !== undefined) {
            cleanAttributes[key] = value;
        }
    }

    const enrichedAttributes = {
        ...cleanAttributes,
        'log.timestamp': timestamp,
        'service.name': SERVICE_NAME,
        'runtime': 'deno',
        'environment': IS_PRODUCTION ? 'production' : 'development',
    };

    // Always log to console
    const consoleMethod = severityText === 'error' ? console.error
        : severityText === 'warn' ? console.warn : console.log;
    consoleMethod(`[${severityText.toUpperCase()}] ${message}`, enrichedAttributes);

    // Queue for PostHog
    if (SHOULD_SEND_TO_POSTHOG) {
        logBatch.push({ timestamp, severityText, body: message, attributes: enrichedAttributes });
        debugLog(`Queued log: [${severityText}] ${message.substring(0, 50)}...`);
    }
}

/**
 * Main logger interface
 */
export const posthogLogger = {
    debug: (message: string, attributes?: LogAttributes) => log('debug', message, attributes),
    info: (message: string, attributes?: LogAttributes) => log('info', message, attributes),
    warn: (message: string, attributes?: LogAttributes) => log('warn', message, attributes),
    error: (message: string, attributes?: LogAttributes) => log('error', message, attributes),
    flush: () => flushLogs(),
    isConfigured: () => SHOULD_SEND_TO_POSTHOG,
};

/**
 * Log specific action events
 */
export function logAction(
    actionName: string,
    event: 'start' | 'success' | 'failed' | 'error',
    attributes: LogAttributes = {}
): void {
    const enrichedAttributes: LogAttributes = {
        'action.name': actionName,
        'action.status': event,
        ...attributes,
    };

    switch (event) {
        case 'start':
        case 'success':
            posthogLogger.info(`Action ${event}: ${actionName}`, enrichedAttributes);
            break;
        case 'failed':
            posthogLogger.warn(`Action ${event}: ${actionName}`, enrichedAttributes);
            break;
        case 'error':
            posthogLogger.error(`Action ${event}: ${actionName}`, enrichedAttributes);
            break;
    }
}

/**
 * Higher-order function to wrap actions with logging
 */
export function withLogging<TArgs extends any[], TResult extends ActionResult<any>>(
    actionName: string,
    action: (...args: TArgs) => Promise<TResult>,
    options: { logArgs?: boolean; userId?: string } = {}
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
        const requestId = generateRequestId();
        const startTime = Date.now();

        const baseAttributes: LogAttributes = {
            'action.name': actionName,
            'action.request_id': requestId,
            'action.user_id': options.userId,
        };

        posthogLogger.info(`Action started: ${actionName}`, { ...baseAttributes, 'action.status': 'started' });

        try {
            const result = await action(...args);
            const duration = Date.now() - startTime;

            if (result.success) {
                posthogLogger.info(`Action completed: ${actionName}`, {
                    ...baseAttributes, 'action.status': 'success', 'action.duration_ms': duration,
                });
            } else {
                posthogLogger.warn(`Action failed: ${actionName}`, {
                    ...baseAttributes, 'action.status': 'failed', 'action.duration_ms': duration,
                    'action.error_message': result.error?.message || 'Unknown error',
                });
            }

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;
            posthogLogger.error(`Action error: ${actionName}`, {
                ...baseAttributes, 'action.status': 'error', 'action.duration_ms': duration,
                'action.error_message': error?.message || 'Unknown error',
            });
            throw error;
        }
    };
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(request: Request) {
    const url = new URL(request.url);
    const requestId = generateRequestId();

    const createLogFn = (level: 'debug' | 'info' | 'warn') =>
        (message: string, context: LogContext = {}) =>
            posthogLogger[level](message, { ...context, path: url.pathname, method: request.method, requestId });

    return {
        requestId,
        debug: createLogFn('debug'),
        info: createLogFn('info'),
        warn: createLogFn('warn'),
        error: (message: string, error?: Error, context: LogContext = {}) => {
            const attrs: LogAttributes = { ...context, path: url.pathname, method: request.method, requestId };
            if (error) {
                attrs['error.message'] = error.message;
                attrs['error.name'] = error.name;
                if (error.stack) attrs['error.stack'] = error.stack.substring(0, 500);
            }
            posthogLogger.error(message, attrs);
        },
        flush: () => posthogLogger.flush(),
    };
}

export default posthogLogger;
