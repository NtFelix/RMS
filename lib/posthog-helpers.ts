/**
 * PostHog Event Tracking Helper
 * 
 * Provides a reusable function for capturing PostHog events
 * with consistent error handling and logging.
 */

import { getPostHogServer } from '@/app/posthog-server.mjs'
import { logger } from '@/utils/logger'
import { posthogLogger } from '@/lib/posthog-logger'
import { headers } from 'next/headers'

export interface PostHogEventProperties {
    [key: string]: string | number | boolean | null | undefined | string[] | number[]
}

export interface RequestContext {
    /** The current URL or pathname where the action was triggered */
    pathname?: string
    /** The referer URL */
    referer?: string
    /** The host */
    host?: string
}

/**
 * Extract URL context from request headers.
 * This is useful for API routes to include URL information in events.
 */
export async function getRequestContext(): Promise<RequestContext> {
    try {
        const headersList = await headers()
        const referer = headersList.get('referer') || undefined
        const host = headersList.get('host') || undefined

        // Extract pathname from referer if available
        let pathname: string | undefined
        if (referer) {
            try {
                const url = new URL(referer)
                pathname = url.pathname
            } catch {
                // If referer is not a valid URL, try to extract pathname directly
                pathname = referer.startsWith('/') ? referer : undefined
            }
        }

        return { pathname, referer, host }
    } catch {
        // headers() might fail in some contexts
        return {}
    }
}

/**
 * Capture a PostHog event with consistent error handling.
 * 
 * Note: The PostHog server is configured with flushAt: 1, which means
 * events are automatically flushed after each capture() call.
 * We still flush the posthogLogger to ensure logs are sent.
 * 
 * @param userId - The distinct ID for the event (usually user.id)
 * @param event - The event name
 * @param properties - Event properties
 * @param requestContext - Optional URL context from the request
 */
export async function capturePostHogEvent(
    userId: string,
    event: string,
    properties: PostHogEventProperties,
    requestContext?: RequestContext
): Promise<void> {
    try {
        const posthog = getPostHogServer()

        // Build the full properties object with URL context if available
        const fullProperties: PostHogEventProperties = {
            ...properties,
        }

        // Add URL context if provided
        if (requestContext?.pathname) {
            fullProperties.$pathname = requestContext.pathname
        }
        if (requestContext?.referer) {
            fullProperties.$referrer = requestContext.referer
            // $current_url is what PostHog uses for the URL column
            fullProperties.$current_url = requestContext.referer
        }
        if (requestContext?.host) {
            fullProperties.$host = requestContext.host
        }

        posthog.capture({
            distinctId: userId,
            event,
            properties: fullProperties,
        })
        // Note: posthog.flush() is not needed since flushAt: 1 auto-flushes
        // But we still need to flush the logger
        await posthogLogger.flush()
        logger.info(`[PostHog] Captured event: ${event} for user: ${userId}`)
    } catch (phError) {
        logger.error(
            `Failed to capture PostHog event: ${event}`,
            phError instanceof Error ? phError : new Error(String(phError))
        )
    }
}

/**
 * Capture a PostHog event with automatic request context extraction.
 * Use this in API routes where you want to automatically include URL info.
 * 
 * @param userId - The distinct ID for the event (usually user.id)
 * @param event - The event name
 * @param properties - Event properties
 */
export async function capturePostHogEventWithContext(
    userId: string,
    event: string,
    properties: PostHogEventProperties
): Promise<void> {
    const context = await getRequestContext()
    return capturePostHogEvent(userId, event, properties, context)
}

