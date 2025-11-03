/**
 * Unit tests for DirectoryCacheManager
 */

import { DirectoryCacheManager, DirectoryContents, CacheStats } from '../directory-cache'

// Mock data
const createMockDirectoryContents = (path: string): DirectoryContents => ({
  files: [
    {
      id: `file-${path}-1`,
      name: 'document.pdf',
      size: 1024,
      type: 'application/pdf',
      lastModified: new Date(),
      path: `${path}/document.pdf`
    }
  ],
  folders: [
    {
      id: `folder-${path}-1`,
      name: 'subfolder',
      path: `${path}/subfolder`,
      itemCount: 5
    }
  ],
  breadcrumbs: [
    { id: 'root', name: 'Root', path: '/' },
    { id: path, name: path.split('/').pop() || '', path }
  ],
  timestamp: Date.now()
})

describe('DirectoryCacheManager', () => {
  let cache: DirectoryCacheManager
  
  // Suppress expected warning logs in tests
  let consoleWarnSpy: jest.SpyInstance;
  
  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });
  
  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    cache = new DirectoryCacheManager({
      maxSize: 5,
      maxMemoryMB: 1,
      ttlMinutes: 1,
      enablePreloading: false,
      enableMemoryMonitoring: false
    })
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('Basic Cache Operations', () => {
    test('should store and retrieve directory contents', () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      cache.set(path, contents)
      const retrieved = cache.get(path)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.files).toHaveLength(1)
      expect(retrieved?.folders).toHaveLength(1)
      expect(retrieved?.files[0].name).toBe('document.pdf')
    })

    test('should return null for non-existent entries', () => {
      const result = cache.get('/non-existent')
      expect(result).toBeNull()
    })

    test('should update access time on get', async () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      cache.set(path, contents)
      
      // Wait a bit and access again
      await new Promise(resolve => setTimeout(resolve, 10))
      const retrieved = cache.get(path)
      expect(retrieved).toBeTruthy()
    })

    test('should invalidate specific entries', () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      cache.set(path, contents)
      expect(cache.get(path)).toBeTruthy()

      cache.invalidate(path)
      expect(cache.get(path)).toBeNull()
    })

    test('should clear all entries', () => {
      cache.set('/folder1', createMockDirectoryContents('/folder1'))
      cache.set('/folder2', createMockDirectoryContents('/folder2'))

      expect(cache.get('/folder1')).toBeTruthy()
      expect(cache.get('/folder2')).toBeTruthy()

      cache.clear()
      expect(cache.get('/folder1')).toBeNull()
      expect(cache.get('/folder2')).toBeNull()
    })
  })

  describe('LRU Eviction', () => {
    test('should evict least recently used entries when size limit reached', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`/folder${i}`, createMockDirectoryContents(`/folder${i}`))
      }

      // All entries should be present
      for (let i = 0; i < 5; i++) {
        expect(cache.get(`/folder${i}`)).toBeTruthy()
      }

      // Add one more entry, should evict the oldest
      cache.set('/folder5', createMockDirectoryContents('/folder5'))

      // First entry should be evicted
      expect(cache.get('/folder0')).toBeNull()
      expect(cache.get('/folder5')).toBeTruthy()
    })

    test('should update LRU order on access', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`/folder${i}`, createMockDirectoryContents(`/folder${i}`))
      }

      // Access the first entry to make it most recently used
      cache.get('/folder0')

      // Add new entry
      cache.set('/folder5', createMockDirectoryContents('/folder5'))

      // folder0 should still be present (was accessed recently)
      // folder1 should be evicted (was least recently used)
      expect(cache.get('/folder0')).toBeTruthy()
      expect(cache.get('/folder1')).toBeNull()
      expect(cache.get('/folder5')).toBeTruthy()
    })
  })

  describe('TTL (Time To Live)', () => {
    test('should expire entries after TTL', async () => {
      const shortTtlCache = new DirectoryCacheManager({
        ttlMinutes: 0.001, // Very short TTL for testing
        enableMemoryMonitoring: false
      })

      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      shortTtlCache.set(path, contents)
      expect(shortTtlCache.get(path)).toBeTruthy()

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(shortTtlCache.get(path)).toBeNull()
      shortTtlCache.destroy()
    })

    test('should not expire entries within TTL', () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      cache.set(path, contents)
      
      // Should still be valid immediately
      expect(cache.get(path)).toBeTruthy()
    })
  })

  describe('Memory Management', () => {
    test('should track memory usage', () => {
      const stats = cache.getStats()
      expect(stats.memoryUsage).toBe(0)

      cache.set('/folder1', createMockDirectoryContents('/folder1'))
      
      const updatedStats = cache.getStats()
      expect(updatedStats.memoryUsage).toBeGreaterThan(0)
    })

    test('should evict entries when memory limit exceeded', () => {
      const smallMemoryCache = new DirectoryCacheManager({
        maxSize: 100, // High size limit
        maxMemoryMB: 0.001, // Very small memory limit
        enableMemoryMonitoring: false
      })

      // Add entries until memory limit is reached
      for (let i = 0; i < 10; i++) {
        smallMemoryCache.set(`/folder${i}`, createMockDirectoryContents(`/folder${i}`))
      }

      // Some entries should have been evicted due to memory limit
      const stats = smallMemoryCache.getStats()
      expect(stats.entryCount).toBeLessThan(10)
      
      smallMemoryCache.destroy()
    })
  })

  describe('Statistics', () => {
    test('should track hit rate correctly', () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      // Initial stats
      let stats = cache.getStats()
      expect(stats.hitRate).toBe(0)
      expect(stats.totalRequests).toBe(0)

      // Miss
      cache.get('/non-existent')
      stats = cache.getStats()
      expect(stats.hitRate).toBe(0)
      expect(stats.totalRequests).toBe(1)
      expect(stats.totalMisses).toBe(1)

      // Set and hit
      cache.set(path, contents)
      cache.get(path)
      stats = cache.getStats()
      expect(stats.hitRate).toBe(0.5) // 1 hit out of 2 requests
      expect(stats.totalRequests).toBe(2)
      expect(stats.totalHits).toBe(1)
    })

    test('should track entry count', () => {
      let stats = cache.getStats()
      expect(stats.entryCount).toBe(0)

      cache.set('/folder1', createMockDirectoryContents('/folder1'))
      stats = cache.getStats()
      expect(stats.entryCount).toBe(1)

      cache.set('/folder2', createMockDirectoryContents('/folder2'))
      stats = cache.getStats()
      expect(stats.entryCount).toBe(2)

      cache.invalidate('/folder1')
      stats = cache.getStats()
      expect(stats.entryCount).toBe(1)
    })
  })

  describe('Preloading', () => {
    test('should preload directories successfully', async () => {
      const preloadCache = new DirectoryCacheManager({
        enablePreloading: true,
        enableMemoryMonitoring: false
      })

      const mockFetchFn = jest.fn().mockImplementation((path: string) => 
        Promise.resolve(createMockDirectoryContents(path))
      )

      const pathsToPreload = ['/folder1', '/folder2', '/folder3']
      
      await preloadCache.preload(pathsToPreload, mockFetchFn)

      // All paths should be cached
      pathsToPreload.forEach(path => {
        expect(preloadCache.get(path)).toBeTruthy()
      })

      expect(mockFetchFn).toHaveBeenCalledTimes(3)
      preloadCache.destroy()
    })

    test('should not preload already cached directories', async () => {
      const preloadCache = new DirectoryCacheManager({
        enablePreloading: true,
        enableMemoryMonitoring: false
      })

      const mockFetchFn = jest.fn().mockImplementation((path: string) => 
        Promise.resolve(createMockDirectoryContents(path))
      )

      // Pre-cache one directory
      preloadCache.set('/folder1', createMockDirectoryContents('/folder1'))

      const pathsToPreload = ['/folder1', '/folder2']
      
      await preloadCache.preload(pathsToPreload, mockFetchFn)

      // Should only fetch the uncached directory
      expect(mockFetchFn).toHaveBeenCalledTimes(1)
      expect(mockFetchFn).toHaveBeenCalledWith('/folder2')
      
      preloadCache.destroy()
    })

    test('should handle preload failures gracefully', async () => {
      const preloadCache = new DirectoryCacheManager({
        enablePreloading: true,
        enableMemoryMonitoring: false
      })

      const mockFetchFn = jest.fn().mockImplementation((path: string) => {
        if (path === '/error-folder') {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve(createMockDirectoryContents(path))
      })

      const pathsToPreload = ['/folder1', '/error-folder', '/folder2']
      
      // Should not throw despite one failure
      await expect(preloadCache.preload(pathsToPreload, mockFetchFn)).resolves.toBeUndefined()

      // Successful preloads should be cached
      expect(preloadCache.get('/folder1')).toBeTruthy()
      expect(preloadCache.get('/folder2')).toBeTruthy()
      expect(preloadCache.get('/error-folder')).toBeNull()
      
      preloadCache.destroy()
    })
  })

  describe('Path Utilities', () => {
    test('should generate correct preload paths', () => {
      const paths = cache.getPreloadPaths('/house1/apartment2')
      
      // Should include parent path
      expect(paths).toContain('/house1')
    })

    test('should handle root path correctly', () => {
      const paths = cache.getPreloadPaths('/')
      
      // Root should not have parent
      expect(paths).toHaveLength(0)
    })

    test('should handle empty path correctly', () => {
      const paths = cache.getPreloadPaths('')
      
      expect(paths).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    test('should handle concurrent access correctly', () => {
      const path = '/test-folder'
      const contents = createMockDirectoryContents(path)

      cache.set(path, contents)

      // Simulate concurrent access
      const results = Array.from({ length: 10 }, () => cache.get(path))
      
      results.forEach(result => {
        expect(result).toBeTruthy()
        expect(result?.files).toHaveLength(1)
      })
    })

    test('should handle updating existing entries', () => {
      const path = '/test-folder'
      const contents1 = createMockDirectoryContents(path)
      const contents2 = {
        ...createMockDirectoryContents(path),
        files: [
          ...contents1.files,
          {
            id: 'new-file',
            name: 'new-document.pdf',
            size: 2048,
            type: 'application/pdf',
            lastModified: new Date(),
            path: `${path}/new-document.pdf`
          }
        ]
      }

      cache.set(path, contents1)
      expect(cache.get(path)?.files).toHaveLength(1)

      cache.set(path, contents2)
      expect(cache.get(path)?.files).toHaveLength(2)
    })

    test('should handle very large entries', () => {
      const path = '/large-folder'
      const largeContents: DirectoryContents = {
        files: Array.from({ length: 1000 }, (_, i) => ({
          id: `file-${i}`,
          name: `document-${i}.pdf`,
          size: 1024 * i,
          type: 'application/pdf',
          lastModified: new Date(),
          path: `${path}/document-${i}.pdf`
        })),
        folders: Array.from({ length: 100 }, (_, i) => ({
          id: `folder-${i}`,
          name: `subfolder-${i}`,
          path: `${path}/subfolder-${i}`,
          itemCount: i * 10
        })),
        breadcrumbs: [
          { id: 'root', name: 'Root', path: '/' },
          { id: path, name: 'large-folder', path }
        ],
        timestamp: Date.now()
      }

      cache.set(path, largeContents)
      const retrieved = cache.get(path)
      
      expect(retrieved?.files).toHaveLength(1000)
      expect(retrieved?.folders).toHaveLength(100)
    })
  })
})