/**
 * Navigation Controller - Centralized navigation state management
 * 
 * This module provides a robust, reliable navigation system with:
 * - Request deduplication and cancellation
 * - Optimistic updates
 * - Request queuing and prioritization
 * - Automatic retry with exponential backoff
 * - Navigation state machine
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'

enableMapSet()

// Navigation states for state machine
export type NavigationState =
    | 'idle'
    | 'navigating'
    | 'loading'
    | 'error'
    | 'success'

export interface NavigationRequest {
    id: string
    path: string
    priority: number
    timestamp: number
    abortController: AbortController
    retryCount: number
    maxRetries: number
}

export interface NavigationResult<T = unknown> {
    success: boolean
    data?: T
    error?: string
    fromCache: boolean
    loadTime: number
}

export interface NavigationControllerState {
    // Current state
    currentPath: string
    previousPath: string | null
    navigationState: NavigationState

    // Request management
    activeRequest: NavigationRequest | null
    pendingRequests: Map<string, NavigationRequest>
    completedRequests: Map<string, { timestamp: number; result: NavigationResult }>

    // Performance tracking
    averageLoadTime: number
    loadTimes: number[]
    errorCount: number
    successCount: number
    lastError: string | null

    // Configuration
    maxPendingRequests: number
    requestTimeout: number
    retryDelay: number
    maxRetries: number

    // Actions
    navigate: (path: string, options?: NavigationOptions) => Promise<NavigationResult>
    cancelNavigation: (path?: string) => void
    cancelAllNavigations: () => void
    prefetch: (path: string) => Promise<void>
    getNavigationStats: () => NavigationStats
    reset: () => void
    clearError: () => void
}

export interface NavigationOptions {
    force?: boolean // Force reload even if cached
    priority?: number // Higher priority requests are processed first
    skipOptimistic?: boolean // Skip optimistic updates
    timeout?: number // Custom timeout for this request
}

export interface NavigationStats {
    currentPath: string
    state: NavigationState
    activeRequestCount: number
    pendingRequestCount: number
    averageLoadTime: number
    successRate: number
    errorCount: number
    retryCount: number
}

// Request ID generator
let requestIdCounter = 0
function generateRequestId(): string {
    return `nav_${Date.now()}_${++requestIdCounter}`
}

const INITIAL_STATE = {
    currentPath: '',
    previousPath: null,
    navigationState: 'idle' as NavigationState,
    activeRequest: null,
    pendingRequests: new Map<string, NavigationRequest>(),
    completedRequests: new Map<string, { timestamp: number; result: NavigationResult }>(),
    averageLoadTime: 0,
    loadTimes: [] as number[],
    errorCount: 0,
    successCount: 0,
    lastError: null as string | null,
    maxPendingRequests: 5,
    requestTimeout: 15000, // 15 seconds
    retryDelay: 1000, // 1 second base delay
    maxRetries: 3,
}

export const useNavigationController = create<NavigationControllerState>()(
    immer((set, get) => ({
        ...INITIAL_STATE,

        navigate: async (path: string, options: NavigationOptions = {}): Promise<NavigationResult> => {
            const state = get()
            const { force = false, priority = 50, timeout = state.requestTimeout } = options

            // Quick check: if already at this path and not forcing, return early
            if (state.currentPath === path && !force) {
                // Check if we have a recent completed request for this path
                const completed = state.completedRequests.get(path)
                if (completed && Date.now() - completed.timestamp < 60000) {
                    return completed.result
                }
            }

            // Cancel any existing navigation to the same path (prevents duplicates)
            const existingPending = state.pendingRequests.get(path)
            if (existingPending && !force) {
                // Return a promise that resolves when the existing request completes
                return new Promise((resolve) => {
                    const checkCompleted = () => {
                        const completed = get().completedRequests.get(path)
                        if (completed) {
                            resolve(completed.result)
                        } else {
                            setTimeout(checkCompleted, 100)
                        }
                    }
                    setTimeout(checkCompleted, 100)
                })
            }

            // Create new navigation request
            const request: NavigationRequest = {
                id: generateRequestId(),
                path,
                priority,
                timestamp: Date.now(),
                abortController: new AbortController(),
                retryCount: 0,
                maxRetries: state.maxRetries,
            }

            // Add to pending requests
            set((draft) => {
                draft.pendingRequests.set(path, request)
                draft.navigationState = 'navigating'
            })

            // Process the request
            const result = await processNavigationRequest(request, timeout, get, set)

            return result
        },

        cancelNavigation: (path?: string) => {
            set((draft) => {
                if (path) {
                    const request = draft.pendingRequests.get(path)
                    if (request) {
                        request.abortController.abort()
                        draft.pendingRequests.delete(path)
                    }
                } else if (draft.activeRequest) {
                    draft.activeRequest.abortController.abort()
                    draft.activeRequest = null
                }
            })
        },

        cancelAllNavigations: () => {
            set((draft) => {
                // Cancel active request
                if (draft.activeRequest) {
                    draft.activeRequest.abortController.abort()
                    draft.activeRequest = null
                }

                // Cancel all pending requests
                for (const request of draft.pendingRequests.values()) {
                    request.abortController.abort()
                }
                draft.pendingRequests.clear()
                draft.navigationState = 'idle'
            })
        },

        prefetch: async (path: string): Promise<void> => {
            const state = get()

            // Don't prefetch if already cached or pending
            if (state.completedRequests.has(path) || state.pendingRequests.has(path)) {
                return
            }

            // Low priority prefetch
            await state.navigate(path, { priority: 10, skipOptimistic: true })
        },

        getNavigationStats: (): NavigationStats => {
            const state = get()
            const totalRequests = state.successCount + state.errorCount

            return {
                currentPath: state.currentPath,
                state: state.navigationState,
                activeRequestCount: state.activeRequest ? 1 : 0,
                pendingRequestCount: state.pendingRequests.size,
                averageLoadTime: state.averageLoadTime,
                successRate: totalRequests > 0 ? state.successCount / totalRequests : 1,
                errorCount: state.errorCount,
                retryCount: state.activeRequest?.retryCount || 0
            }
        },

        reset: () => {
            set((draft) => {
                // Cancel all requests first
                if (draft.activeRequest) {
                    draft.activeRequest.abortController.abort()
                }
                for (const request of draft.pendingRequests.values()) {
                    request.abortController.abort()
                }

                // Reset to initial state
                Object.assign(draft, {
                    ...INITIAL_STATE,
                    pendingRequests: new Map(),
                    completedRequests: new Map(),
                })
            })
        },

        clearError: () => {
            set((draft) => {
                if (draft.navigationState === 'error') {
                    draft.navigationState = 'idle'
                    draft.lastError = null
                }
            })
        },
    }))
)

// Process navigation request with retry logic
async function processNavigationRequest(
    request: NavigationRequest,
    timeout: number,
    get: () => NavigationControllerState,
    set: (updater: (draft: NavigationControllerState) => void) => void
): Promise<NavigationResult> {
    const startTime = performance.now()

    set((draft) => {
        draft.activeRequest = request
        draft.navigationState = 'loading'
        draft.previousPath = draft.currentPath
        draft.lastError = null // Clear last error on new navigation attempt
    })

    try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Navigation timeout')), timeout)
        })

        // Create abort promise
        const abortPromise = new Promise<never>((_, reject) => {
            request.abortController.signal.addEventListener('abort', () => {
                reject(new Error('Navigation cancelled'))
            })
        })

        // Import and call the optimized file loader
        const { loadFilesOptimized } = await import('@/lib/optimized-file-loader')

        // Extract userId from path - handle both user_ID and user_ID/subpath formats
        const userIdMatch = request.path.match(/^user_([^/]+)/)
        if (!userIdMatch) {
            throw new Error('Invalid path format: expected user_ID prefix')
        }
        const userId = userIdMatch[1]

        // Execute the request with timeout and abort handling
        const dataPromise = loadFilesOptimized(userId, request.path, request.abortController.signal)
        const result = await Promise.race([dataPromise, timeoutPromise, abortPromise])

        const loadTime = performance.now() - startTime

        if (result.error) {
            throw new Error(result.error)
        }

        // Success!
        const navigationResult: NavigationResult = {
            success: true,
            data: result,
            fromCache: false,
            loadTime,
        }

        set((draft) => {
            draft.currentPath = request.path
            draft.navigationState = 'success'
            draft.activeRequest = null
            draft.pendingRequests.delete(request.path)
            draft.completedRequests.set(request.path, {
                timestamp: Date.now(),
                result: navigationResult,
            })
            draft.successCount++
            draft.lastError = null // Clear last error on success

            // Update load time tracking
            draft.loadTimes.push(loadTime)
            if (draft.loadTimes.length > 100) {
                draft.loadTimes = draft.loadTimes.slice(-100)
            }
            draft.averageLoadTime = draft.loadTimes.reduce((a, b) => a + b, 0) / draft.loadTimes.length

            // Cleanup old completed requests (keep last 50)
            if (draft.completedRequests.size > 50) {
                const entries = Array.from(draft.completedRequests.entries())
                    .sort((a, b) => b[1].timestamp - a[1].timestamp)
                    .slice(0, 50)
                draft.completedRequests = new Map(entries)
            }
        })

        // Reset to idle after short delay
        setTimeout(() => {
            set((draft) => {
                if (draft.navigationState === 'success') {
                    draft.navigationState = 'idle'
                }
            })
        }, 100)

        return navigationResult

    } catch (error) {
        const loadTime = performance.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Check if we should retry
        if (
            request.retryCount < request.maxRetries &&
            !errorMessage.includes('cancelled') &&
            !request.abortController.signal.aborted
        ) {
            const newRetryCount = request.retryCount + 1
            const retryDelay = get().retryDelay * Math.pow(2, newRetryCount - 1)

            console.warn(`Navigation retry ${newRetryCount}/${request.maxRetries} for ${request.path} in ${retryDelay}ms`)

            // Create a new request object with updated retryCount instead of mutating
            const retryRequest: NavigationRequest = {
                ...request,
                retryCount: newRetryCount,
            }

            // Update the pending request in the store
            set((draft) => {
                draft.pendingRequests.set(request.path, retryRequest)
                if (draft.activeRequest?.id === request.id) {
                    draft.activeRequest = retryRequest
                }
            })

            await new Promise(resolve => setTimeout(resolve, retryDelay))
            return processNavigationRequest(retryRequest, timeout, get, set)
        }

        // Final failure
        const navigationResult: NavigationResult = {
            success: false,
            error: errorMessage,
            fromCache: false,
            loadTime,
        }

        set((draft) => {
            draft.navigationState = 'error'
            draft.activeRequest = null
            draft.pendingRequests.delete(request.path)
            draft.errorCount++
            draft.lastError = errorMessage
        })

        // Reset to idle after showing error
        setTimeout(() => {
            set((draft) => {
                if (draft.navigationState === 'error') {
                    draft.navigationState = 'idle'
                }
            })
        }, 3000)

        return navigationResult
    }
}

// React hook for using navigation controller
export function useNavigation() {
    const store = useNavigationController()

    return {
        currentPath: store.currentPath,
        previousPath: store.previousPath,
        state: store.navigationState,
        isNavigating: store.navigationState === 'navigating' || store.navigationState === 'loading',
        isError: store.navigationState === 'error',
        error: store.lastError,
        navigate: store.navigate,
        cancel: store.cancelNavigation,
        cancelAll: store.cancelAllNavigations,
        prefetch: store.prefetch,
        stats: store.getNavigationStats(),
        clearError: store.clearError,
    }
}
