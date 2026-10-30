/**
 * Tests for file loader
 */

const mockFetchResult = {
    files: [{ id: '1', name: 'test.pdf' }],
    folders: [],
    breadcrumbs: [{ name: 'Root', path: 'user_123', type: 'root' as const }],
    totalSize: 0,
}

beforeEach(() => {
    jest.clearAllMocks()
    // Mock global fetch to return the expected structure
    global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFetchResult),
    } as any)
})

afterEach(() => {
    jest.resetAllMocks()
    jest.resetModules()
})

describe('loadFiles', () => {
    it('should deduplicate concurrent requests to the same path', async () => {
        const { loadFiles } = await import('@/lib/file-loader')

        // Make multiple concurrent requests
        const requests = [
            loadFiles('123', 'user_123/folder1'),
            loadFiles('123', 'user_123/folder1'),
            loadFiles('123', 'user_123/folder1'),
        ]

        const results = await Promise.all(requests)

        // All should return the same result
        results.forEach(result => {
            expect(result.files).toEqual(mockFetchResult.files)
        })

        // fetch should only be called once (deduplication)
        expect(fetch).toHaveBeenCalledTimes(1)
    })

    it('should cancel pending load when abort signal is triggered', async () => {
        const { loadFiles } = await import('@/lib/file-loader')

        // Mock fetch to reject with AbortError when the signal is aborted
        global.fetch = jest.fn().mockImplementation((_url: string, options?: any) => {
            return new Promise((_resolve, reject) => {
                const signal = options?.signal
                if (signal?.aborted) {
                    const err = new Error('The operation was aborted')
                    err.name = 'AbortError'
                    reject(err)
                    return
                }
                signal?.addEventListener('abort', () => {
                    const err = new Error('The operation was aborted')
                    err.name = 'AbortError'
                    reject(err)
                })
            })
        })

        const abortController = new AbortController()

        // Start the request
        const promise = loadFiles('123', 'user_123/folder1', abortController.signal)

        // Abort immediately
        abortController.abort()

        const result = await promise

        expect(result.error).toContain('cancelled')
    })

    it('should return cached breadcrumbs when available', async () => {
        const { getCachedBreadcrumbs, setCachedBreadcrumbs, invalidateBreadcrumbCache } = await import('@/lib/file-loader')

        // Clear cache first
        invalidateBreadcrumbCache()

        // Should be null initially
        expect(getCachedBreadcrumbs('user_123/folder1')).toBeNull()

        // Add to cache
        const breadcrumbs = [
            { name: 'Root', path: 'user_123', type: 'root' as const },
            { name: 'Folder 1', path: 'user_123/folder1', type: 'category' as const },
        ]
        setCachedBreadcrumbs('user_123/folder1', breadcrumbs as any)

        // Should return cached value
        expect(getCachedBreadcrumbs('user_123/folder1')).toEqual(breadcrumbs)
    })
})

describe('getPreloadPaths', () => {
    it('should include parent path for nested directories', async () => {
        const { getPreloadPaths } = await import('@/lib/file-loader')

        const paths = getPreloadPaths('123', 'user_123/house1/apartment1')

        // Should include parent
        expect(paths).toContain('user_123/house1')
    })

    it('should include common system folders for root path', async () => {
        const { getPreloadPaths } = await import('@/lib/file-loader')

        const paths = getPreloadPaths('123', 'user_123')

        // Should include system folders
        expect(paths).toContain('user_123/Miscellaneous')
        expect(paths).toContain('user_123/house_documents')
    })
})
