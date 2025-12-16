/**
 * PostHog Event Tracking Helper
 * 
 * Provides a reusable function for capturing PostHog events
 * with consistent error handling and logging.
 */

import { getPostHogServer } from '@/app/posthog-server.mjs'
import { logger } from '@/utils/logger'
import { posthogLogger } from '@/lib/posthog-logger'

export interface PostHogEventProperties {
    [key: string]: string | number | boolean | null | undefined | string[] | number[]
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
 */
export async function capturePostHogEvent(
    userId: string,
    event: string,
    properties: PostHogEventProperties
): Promise<void> {
    try {
        const posthog = getPostHogServer()
        posthog.capture({
            distinctId: userId,
            event,
            properties,
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
