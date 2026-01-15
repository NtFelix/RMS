/**
 * File Loader
 * 
 * Provides high-performance file and folder loading with:
 * - Single RPC call for all folder contents
 * - Request deduplication across multiple callers
 * - Request cancellation support
 * - LRU caching with intelligent invalidation
 */

import type { StorageObject, VirtualFolder, BreadcrumbItem } from '@/hooks/use-cloud-storage-store'

// In-memory request deduplication
interface PendingRequest<T> {
    promise: Promise<T>
    timestamp: number
    abortController: AbortController
}

const pendingRequests = new Map<string, PendingRequest<LoadResult>>()
const REQUEST_DEDUP_WINDOW = 100 // ms

export interface LoadResult {
    files: StorageObject[]
    folders: VirtualFolder[]
    breadcrumbs: BreadcrumbItem[]
    totalSize: number
    error?: string
    loadTime?: number
}

// Helper for logging (matches the project's logger format)
function logLoader(level: 'INFO' | 'DEBUG' | 'WARN', message: string, context?: Record<string, unknown>) {
    const timestamp = new Date().toISOString()
    const contextString = context ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''
    console.log(`[${timestamp}] [${level}] 📂 FileLoader: ${message}${contextString}`)
}

/**
 * Load files and folders for a path
 * Deduplicates requests - multiple simultaneous requests to the same path share a single network request
 */
export async function loadFiles(
    userId: string,
    path: string,
    abortSignal?: AbortSignal
): Promise<LoadResult> {
    const cacheKey = `${userId}:${path}`
    const now = Date.now()

    // Check for existing in-flight request
    const existing = pendingRequests.get(cacheKey)
    if (existing && now - existing.timestamp < REQUEST_DEDUP_WINDOW) {
        // Wait for existing request
        logLoader('DEBUG', 'Deduplicating request - reusing in-flight', { path })
        try {
            return await existing.promise
        } catch (error) {
            // If existing request failed, continue to create new request
        }
    }

    // Create new request
    const abortController = new AbortController()

    // Link to external abort signal if provided
    if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
            abortController.abort()
        })
    }

    const loadPromise = executeFileLoad(userId, path, abortController.signal)

    pendingRequests.set(cacheKey, {
        promise: loadPromise,
        timestamp: now,
        abortController,
    })

    try {
        const result = await loadPromise
        return result
    } finally {
        // Cleanup after a short delay to allow late joiners
        setTimeout(() => {
            const current = pendingRequests.get(cacheKey)
            if (current && current.timestamp === now) {
                pendingRequests.delete(cacheKey)
            }
        }, REQUEST_DEDUP_WINDOW)
    }
}

/**
 * Cancel all pending requests for a path
 */
export function cancelPendingLoad(userId: string, path: string): void {
    const cacheKey = `${userId}:${path}`
    const pending = pendingRequests.get(cacheKey)
    if (pending) {
        pending.abortController.abort()
        pendingRequests.delete(cacheKey)
    }
}

/**
 * Cancel all pending requests for a user
 */
export function cancelAllPendingLoads(userId: string): void {
    for (const [key, pending] of pendingRequests.entries()) {
        if (key.startsWith(`${userId}:`)) {
            pending.abortController.abort()
            pendingRequests.delete(key)
        }
    }
}

async function executeFileLoad(
    userId: string,
    path: string,
    abortSignal: AbortSignal
): Promise<LoadResult> {
    const startTime = performance.now()

    try {
        // Check if aborted before starting
        if (abortSignal.aborted) {
            return {
                files: [],
                folders: [],
                breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
                totalSize: 0,
                error: 'Request cancelled',
            }
        }

        // Import server action
        const { getFolderContents } = await import('@/app/(dashboard)/dateien/actions')

        // Execute with abort check
        const result = await getFolderContents(userId, path)

        // Check if aborted after request
        if (abortSignal.aborted) {
            return {
                files: [],
                folders: [],
                breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
                totalSize: 0,
                error: 'Request cancelled',
            }
        }

        const loadTime = performance.now() - startTime
        const displayPath = path.length > 50 ? '...' + path.slice(-47) : path

        // Log load result
        const status = result.error ? '⚠️' : '✅'
        const level = result.error ? 'WARN' : 'INFO'
        logLoader(level as 'INFO' | 'WARN', `${status} Loaded in ${Math.round(loadTime)}ms`, {
            path: displayPath,
            folders: result.folders.length,
            files: result.files.length,
            executionTime: `${Math.round(loadTime)}ms`,
            ...(result.error ? { error: result.error } : {})
        })

        return {
            files: result.files as unknown as StorageObject[],
            folders: result.folders as unknown as VirtualFolder[],
            breadcrumbs: result.breadcrumbs as unknown as BreadcrumbItem[],
            totalSize: result.totalSize,
            error: result.error,
            loadTime,
        }
    } catch (error) {
        const loadTime = performance.now() - startTime

        return {
            files: [],
            folders: [],
            breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
            totalSize: 0,
            error: error instanceof Error ? error.message : 'Failed to load files',
            loadTime,
        }
    }
}

/**
 * Preload multiple paths in parallel with priority ordering
 */
export async function preloadPaths(
    userId: string,
    paths: string[],
    maxConcurrent: number = 2
): Promise<void> {
    const chunks: string[][] = []
    for (let i = 0; i < paths.length; i += maxConcurrent) {
        chunks.push(paths.slice(i, i + maxConcurrent))
    }

    for (const chunk of chunks) {
        await Promise.allSettled(
            chunk.map(path => loadFiles(userId, path))
        )
    }
}

/**
 * Get paths that should be preloaded based on current path
 */
export function getPreloadPaths(userId: string, currentPath: string): string[] {
    const paths: string[] = []
    const segments = currentPath.split('/').filter(Boolean)
    const basePath = `user_${userId}`

    // Always preload parent
    if (segments.length > 1) {
        const parentPath = segments.slice(0, -1).join('/')
        paths.push(parentPath)
    }

    // Preload common system folders
    if (currentPath === basePath) {
        paths.push(`${basePath}/Miscellaneous`)
        paths.push(`${basePath}/house_documents`)
    }

    return paths
}

// Breadcrumb cache
let breadcrumbCache = new Map<string, { data: BreadcrumbItem[]; timestamp: number }>()
const BREADCRUMB_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function getCachedBreadcrumbs(path: string): BreadcrumbItem[] | null {
    const cached = breadcrumbCache.get(path)
    if (cached && Date.now() - cached.timestamp < BREADCRUMB_CACHE_TTL) {
        return cached.data
    }
    return null
}

export function setCachedBreadcrumbs(path: string, breadcrumbs: BreadcrumbItem[]): void {
    breadcrumbCache.set(path, { data: breadcrumbs, timestamp: Date.now() })

    // Cleanup old entries
    if (breadcrumbCache.size > 100) {
        const entries = Array.from(breadcrumbCache.entries())
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, 50)
        breadcrumbCache = new Map(entries)
    }
}

export function invalidateBreadcrumbCache(): void {
    breadcrumbCache.clear()
}
