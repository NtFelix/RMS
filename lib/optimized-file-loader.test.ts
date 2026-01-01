/**
 * Tests for navigation controller and optimized file loader
 */

// Mock server actions before importing
jest.mock('@/app/(dashboard)/dateien/actions', () => ({
    loadFilesForPath: jest.fn(),
    getPathContents: jest.fn(),
    getTotalStorageUsage: jest.fn(),
}))

describe('loadFilesOptimized', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.resetAllMocks()
        jest.resetModules()
    })

    it('should deduplicate concurrent requests to the same path', async () => {
        const { loadFilesOptimized } = await import('@/lib/optimized-file-loader')
        const { getPathContents } = await import('@/app/(dashboard)/dateien/actions')

        const mockResult = {
            files: [{ id: '1', name: 'test.pdf' }],
            folders: [],
            breadcrumbs: [{ name: 'Root', path: 'user_123', type: 'root' as const }],
        }

            ; (getPathContents as jest.Mock).mockResolvedValue(mockResult)

        // Make multiple concurrent requests
        const requests = [
            loadFilesOptimized('123', 'user_123/folder1'),
            loadFilesOptimized('123', 'user_123/folder1'),
            loadFilesOptimized('123', 'user_123/folder1'),
        ]

        const results = await Promise.all(requests)

        // All should return the same result
        results.forEach(result => {
            expect(result.files).toEqual(mockResult.files)
        })

        // But the server action should only be called once
        expect(getPathContents).toHaveBeenCalledTimes(1)
    })

    it('should cancel pending load when abort signal is triggered', async () => {
        const { loadFilesOptimized } = await import('@/lib/optimized-file-loader')

        const abortController = new AbortController()

        // Start the request
        const promise = loadFilesOptimized('123', 'user_123/folder1', abortController.signal)

        // Abort immediately
        abortController.abort()

        const result = await promise

        expect(result.error).toContain('cancelled')
    })

    it('should return cached breadcrumbs when available', async () => {
        const { getCachedBreadcrumbs, setCachedBreadcrumbs, invalidateBreadcrumbCache } = await import('@/lib/optimized-file-loader')

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
        const { getPreloadPaths } = await import('@/lib/optimized-file-loader')

        const paths = getPreloadPaths('123', 'user_123/house1/apartment1')

        // Should include parent
        expect(paths).toContain('user_123/house1')
    })

    it('should include common system folders for root path', async () => {
        const { getPreloadPaths } = await import('@/lib/optimized-file-loader')

        const paths = getPreloadPaths('123', 'user_123')

        // Should include system folders
        expect(paths).toContain('user_123/Miscellaneous')
        expect(paths).toContain('user_123/house_documents')
    })
})
