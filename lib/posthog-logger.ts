/**
 * PostHog Logging Utility
 * 
 * Centralized logging with PostHog integration.
 * Uses OpenTelemetry OTLP format to send logs to PostHog.
 * 
 * Logs are automatically sent to PostHog whenever POSTHOG_API_KEY is configured.
 * 
 * Features:
 * - Debug mode: Set POSTHOG_LOGS_DEBUG=true to see detailed debug output
 * - Proper response handling with error reporting
 * 
 * @see https://posthog.com/docs/logs/installation
 */

import {
    LogAttributes,
    SERVICE_NAME,
    POSTHOG_API_KEY,
    POSTHOG_HOST,
    getLogsEndpoint,
    buildOTLPPayloadBatch,
} from './otlp-utils';

// Re-export LogAttributes for consumers
export type { LogAttributes };

// Configuration
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_CI = process.env.CI === 'true';
const IS_TEST = process.env.NODE_ENV === 'test';

// Debug mode - set POSTHOG_LOGS_DEBUG=true to enable verbose logging
const DEBUG_MODE = process.env.POSTHOG_LOGS_DEBUG === 'true';

// Always send logs to PostHog when API key is configured (both dev and production)
const SHOULD_SEND_TO_POSTHOG = !!POSTHOG_API_KEY;

// Suppress noisy logs in CI/test environments
const QUIET_MODE = IS_CI || IS_TEST;

function debugLog(...args: unknown[]): void {
    if (DEBUG_MODE) {
        console.log('[PostHog Logger DEBUG]', ...args);
    }
}

let isInitialized = false;

// Store for batched logs
let logBatch: Array<{
    timestamp: string;
    severityText: string;
    body: string;
    attributes: Record<string, unknown>;
}> = [];

// Track statistics for debugging
let stats = {
    totalLogsQueued: 0,
    totalLogsSent: 0,
    totalLogsFailed: 0,
    lastFlushTime: null as Date | null,
    lastFlushStatus: null as number | null,
    lastError: null as string | null,
};

let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Send logs to PostHog via OTLP HTTP
 */
async function flushLogs(): Promise<void> {
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
    debugLog('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${POSTHOG_API_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        stats.lastFlushTime = new Date();
        stats.lastFlushStatus = response.status;

        if (response.ok) {
            stats.totalLogsSent += logsToSend.length;
            debugLog(`✅ Successfully sent ${logsToSend.length} logs to PostHog (status: ${response.status})`);
        } else {
            stats.totalLogsFailed += logsToSend.length;
            const errorBody = await response.text().catch(() => 'Could not read response body');
            const errorMessage = `HTTP ${response.status}: ${errorBody}`;
            stats.lastError = errorMessage;

            console.error(`[PostHog Logger] ❌ Failed to send logs:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
                endpoint,
                logsCount: logsToSend.length,
            });
        }
    } catch (error) {
        stats.totalLogsFailed += logsToSend.length;
        const errorMessage = error instanceof Error ? error.message : String(error);
        stats.lastError = errorMessage;

        console.error('[PostHog Logger] ❌ Network error sending logs:', {
            error: errorMessage,
            endpoint,
            logsCount: logsToSend.length,
        });
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
        debugLog('Logger already initialized, skipping');
        return;
    }

    // In CI/test mode, skip noisy initialization logs
    if (!QUIET_MODE) {
        console.log('[PostHog Logger] 🚀 Initializing...', {
            environment: process.env.NODE_ENV,
            hasApiKey: !!POSTHOG_API_KEY,
            apiKeyPrefix: POSTHOG_API_KEY?.substring(0, 8) + '...',
            host: POSTHOG_HOST,
            endpoint: getLogsEndpoint(),
            debugMode: DEBUG_MODE,
            willSendToPostHog: SHOULD_SEND_TO_POSTHOG,
        });

        if (!POSTHOG_API_KEY) {
            console.warn('[PostHog Logger] ⚠️ POSTHOG_API_KEY not set - logs will only be printed to console');
        } else {
            console.log('[PostHog Logger] ✅ Configured to send logs to PostHog at', getLogsEndpoint());
        }
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

    // Always log to console in development OR if debug mode is on
    if (!IS_PRODUCTION || DEBUG_MODE) {
        const consoleMethod = severityText === 'error' ? console.error
            : severityText === 'warn' ? console.warn
                : console.log;
        consoleMethod(`[${severityText.toUpperCase()}] ${message}`, enrichedAttributes);
    }

    // Queue for sending to PostHog if configured
    if (SHOULD_SEND_TO_POSTHOG) {
        logBatch.push({
            timestamp,
            severityText,
            body: message,
            attributes: enrichedAttributes,
        });
        stats.totalLogsQueued++;
        debugLog(`Queued log #${stats.totalLogsQueued}: [${severityText}] ${message.substring(0, 50)}...`);
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

