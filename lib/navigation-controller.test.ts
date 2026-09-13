/**
 * Tests for the navigation controller's timeout handling.
 *
 * Regression coverage for the "Navigation timeout" error: a slow file loader
 * must surface as a handled navigation failure (never a thrown Error), and the
 * timeout timer must always be cleared so navigations don't leak dangling timers.
 */

// Mock the file loader so we can control how long loadFiles takes to resolve.
const loadFilesMock = jest.fn()
jest.mock('@/lib/file-loader', () => ({
    loadFiles: (...args: unknown[]) => loadFilesMock(...args),
}))

import { useNavigationController } from '@/lib/navigation-controller'

describe('navigation-controller timeout handling', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        loadFilesMock.mockReset()
        useNavigationController.getState().reset()
        // Disable retries so a single timeout resolves the navigation immediately.
        useNavigationController.setState({ maxRetries: 0 })
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it('surfaces a slow loader as a handled failure without throwing', async () => {
        // loadFiles never resolves within the timeout window.
        loadFilesMock.mockReturnValue(new Promise(() => {}))

        const navigatePromise = useNavigationController
            .getState()
            .navigate('user_123/docs', { timeout: 15000 })

        // Fire the timeout.
        jest.advanceTimersByTime(15000)

        const result = await navigatePromise

        expect(result.success).toBe(false)
        expect(result.error).toBe('Navigation timeout')
        expect(useNavigationController.getState().lastError).toBe('Navigation timeout')
        expect(useNavigationController.getState().navigationState).toBe('error')
    })

    it('clears the timeout timer once the loader resolves', async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

        loadFilesMock.mockResolvedValue({
            files: [],
            folders: [],
            breadcrumbs: [],
            totalSize: 0,
        })

        const result = await useNavigationController
            .getState()
            .navigate('user_123/docs', { timeout: 15000 })

        expect(result.success).toBe(true)
        // The timeout timer must be torn down after the race settles.
        expect(clearTimeoutSpy).toHaveBeenCalled()

        clearTimeoutSpy.mockRestore()
    })
})
