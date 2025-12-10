/**
 * Logging Middleware for Server Actions
 * 
 * Provides higher-order functions to wrap server actions with automatic logging.
 * Captures: action start, success, error, duration, and key parameters.
 */

import { posthogLogger } from './posthog-logger';
import {
    LogAttributes,
    POSTHOG_API_KEY,
    getLogsEndpoint,
    buildOTLPPayloadSingle,
} from './otlp-utils';

export interface ActionContext {
    userId?: string;
    actionName: string;
    additionalAttributes?: LogAttributes;
}

export interface ActionResult<T> {
    success: boolean;
    error?: { message: string } | any;
    data?: T;
    [key: string]: any;
}

/**
 * Sanitize sensitive data from log attributes
 * Removes or masks potentially sensitive information
 */
function sanitizeAttributes(attributes: Record<string, any>): LogAttributes {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit_card', 'ssn'];
    const sanitized: LogAttributes = {};

    for (const [key, value] of Object.entries(attributes)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            // For objects, just log that it exists, not its contents
            sanitized[key] = `[Object: ${Object.keys(value).length} keys]`;
        } else if (typeof value === 'string' && value.length > 200) {
            // Truncate long strings
            sanitized[key] = `${value.substring(0, 200)}... [truncated]`;
        } else if (['string', 'number', 'boolean'].includes(typeof value)) {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Send a log directly to PostHog (edge runtime compatible, no batching)
 * This is fire-and-forget - doesn't block the request
 */
function sendLogImmediate(
    severityText: string,
    message: string,
    attributes: LogAttributes = {}
): void {
    if (!POSTHOG_API_KEY) {
        // Just log to console if no API key
        console.log(`[${severityText.toUpperCase()}] ${message}`, attributes);
        return;
    }

    const endpoint = getLogsEndpoint();
    const payload = buildOTLPPayloadSingle(severityText, message, attributes);

    // Fire-and-forget fetch - don't await, don't block
    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify(payload),
    }).then(response => {
        if (!response.ok) {
            console.error(`[PostHog Logger] Failed to send log: ${response.status}`);
        }
    }).catch(error => {
        console.error('[PostHog Logger] Error sending log:', error);
    });
}

/**
 * Higher-order function to wrap server actions with logging
 * 
 * @example
 * ```typescript
 * export const myAction = withLogging(
 *   'createTenant',
 *   async (formData: FormData) => {
 *     // action logic
 *     return { success: true, data: tenant };
 *   }
 * );
 * ```
 */
export function withLogging<TArgs extends any[], TResult extends ActionResult<any>>(
    actionName: string,
    action: (...args: TArgs) => Promise<TResult>,
    options: {
        logArgs?: boolean;
        userId?: string | (() => Promise<string | undefined>);
    } = {}
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
        const requestId = generateRequestId();
        const startTime = Date.now();

        // Get user ID if provided
        let userId: string | undefined;
        if (typeof options.userId === 'function') {
            try {
                userId = await options.userId();
            } catch {
                userId = undefined;
            }
        } else {
            userId = options.userId;
        }

        // Prepare base attributes
        const baseAttributes: LogAttributes = {
            'action.name': actionName,
            'action.request_id': requestId,
            'action.user_id': userId,
        };

        // Log action start
        posthogLogger.info(`Action started: ${actionName}`, {
            ...baseAttributes,
            'action.status': 'started',
            ...(options.logArgs ? sanitizeAttributes({ args: args.length }) : {}),
        });

        try {
            // Execute the action
            const result = await action(...args);
            const duration = Date.now() - startTime;

            // Log based on result
            if (result.success) {
                posthogLogger.info(`Action completed: ${actionName}`, {
                    ...baseAttributes,
                    'action.status': 'success',
                    'action.duration_ms': duration,
                });
            } else {
                posthogLogger.warn(`Action failed: ${actionName}`, {
                    ...baseAttributes,
                    'action.status': 'failed',
                    'action.duration_ms': duration,
                    'action.error_message': result.error?.message || 'Unknown error',
                });
            }

            return result;
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Log unexpected error
            posthogLogger.error(`Action error: ${actionName}`, {
                ...baseAttributes,
                'action.status': 'error',
                'action.duration_ms': duration,
                'action.error_message': error?.message || 'Unknown error',
                'action.error_name': error?.name || 'Error',
            });

            // Re-throw the error
            throw error;
        }
    };
}

/**
 * Log a specific action event without wrapping
 * Useful for logging within existing action implementations
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
 * Log API route events - sends immediately (edge runtime compatible)
 * Use this for API routes, especially edge runtime routes
 */
export function logApiRoute(
    routePath: string,
    method: string,
    event: 'request' | 'response' | 'error',
    attributes: LogAttributes = {}
): void {
    const enrichedAttributes: LogAttributes = {
        'api.route': routePath,
        'api.method': method,
        'api.event': event,
        ...attributes,
    };

    const message = event === 'request'
        ? `API request: ${method} ${routePath}`
        : event === 'response'
            ? `API response: ${method} ${routePath}`
            : `API error: ${method} ${routePath}`;

    const severity = event === 'error' ? 'error' : 'info';

    // Send immediately for edge runtime compatibility
    sendLogImmediate(severity, message, enrichedAttributes);
}

export default { withLogging, logAction, logApiRoute };

