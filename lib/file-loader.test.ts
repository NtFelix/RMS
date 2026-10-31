/**
 * Tests for file loader
 */

const mockFetchResult = {
    files: [{ id: '1', name: 'test.pdf' }],
    folders: [],
    breadcrumbs: [{ name: 'Root', path: 'org_org-1', type: 'root' as const }],
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
            loadFiles('org_org-1/folder1'),
            loadFiles('org_org-1/folder1'),
            loadFiles('org_org-1/folder1'),
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
        const promise = loadFiles('org_org-1/folder1', abortController.signal)

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
        expect(getCachedBreadcrumbs('org_org-1/folder1')).toBeNull()

        // Add to cache
        const breadcrumbs = [
            { name: 'Root', path: 'org_org-1', type: 'root' as const },
            { name: 'Folder 1', path: 'org_org-1/folder1', type: 'category' as const },
        ]
        setCachedBreadcrumbs('org_org-1/folder1', breadcrumbs as any)

        // Should return cached value
        expect(getCachedBreadcrumbs('org_org-1/folder1')).toEqual(breadcrumbs)
    })
})

describe('cancel', () => {
    it('cancelAllPendingLoads aborts every pending request without a user id', async () => {
        const signals: AbortSignal[] = []
        global.fetch = jest.fn().mockImplementation((_url: string, init?: { signal?: AbortSignal }) => {
            signals.push(init!.signal!)
            return new Promise((_resolve, reject) => {
                init!.signal!.addEventListener('abort', () => {
                    const err = new Error('The operation was aborted')
                    err.name = 'AbortError'
                    reject(err)
                })
            })
        })
        const { loadFiles, cancelAllPendingLoads } = await import('@/lib/file-loader')

        const first = loadFiles('org_org-1/folder1')
        const second = loadFiles('org_org-1/folder2')
        await new Promise(resolve => setTimeout(resolve, 0))
        cancelAllPendingLoads()

        expect((await first).error).toContain('cancelled')
        expect((await second).error).toContain('cancelled')
        expect(signals.every(signal => signal.aborted)).toBe(true)
    })
})

describe('getPreloadPaths', () => {
    it('only returns parents that the read check allows for a user with house scope', async () => {
        const { getPreloadPaths } = await import('@/lib/file-loader')
        const { assertPathAllowed } = await import('@/lib/storage-paths')
        const ctx = { orgId: 'org-1', userId: '123', accessibleHouseIds: ['house1'] }

        const candidates = [
            ...getPreloadPaths('123', 'org_org-1/shared/house1'),
            ...getPreloadPaths('123', 'org_org-1/private/123'),
            ...getPreloadPaths('123', 'org_org-1/shared/house1/apartment1'),
            ...getPreloadPaths('123', 'org_org-1'),
        ]

        expect(candidates).toEqual(expect.arrayContaining(['org_org-1/shared', 'org_org-1/private']))
        for (const path of candidates) {
            expect(() => assertPathAllowed(path, ctx, 'read')).not.toThrow()
        }
    })


    it('should include parent path for nested directories', async () => {
        const { getPreloadPaths } = await import('@/lib/file-loader')

        const paths = getPreloadPaths('123', 'org_org-1/shared/house1/apartment1')

        // Should include parent
        expect(paths).toContain('org_org-1/shared/house1')
    })

    it('should include common system folders for root path', async () => {
        const { getPreloadPaths } = await import('@/lib/file-loader')

        const paths = getPreloadPaths('123', 'org_org-1')

        // Should include system folders
        expect(paths).toContain('org_org-1/shared')
        expect(paths).toContain('org_org-1/private/123')
    })
})
