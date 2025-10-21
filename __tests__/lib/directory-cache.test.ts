import { DirectoryCacheManager, type DirectoryContents } from '@/lib/directory-cache'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
})

describe('DirectoryCacheManager', () => {
  let cache: DirectoryCacheManager
  let mockFetchFn: jest.Mock
  
  // Suppress expected warning logs in tests
  let consoleWarnSpy: jest.SpyInstance;
  
  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });
  
  afterAll(() => {
    consoleWarnSpy.mockRestore();
  });

  const createMockContents = (path: string): DirectoryContents => ({
    files: [
      {
        id: `file-${path}`,
        name: `file-${path}.txt`,
        size: 1024,
        type: 'text/plain',
        lastModified: new Date(),
        path: `${path}/file.txt`
      }
    ],
    folders: [
      {
        id: `folder-${path}`,
        name: `subfolder`,
        path: `${path}/subfolder`
      }
    ],
    breadcrumbs: [
      {
        id: 'root',
        name: 'Root',
        path: '/'
      },
      {
        id: path,
        name: path,
        path
      }
    ],
    timestamp: Date.now()
  })

  beforeEach(() => {
    cache = new DirectoryCacheManager({
      maxSize: 5,
      maxMemoryMB: 1,
      ttlMinutes: 1,
      enablePreloading: true,
      enableMemoryMonitoring: false, // Disable for tests
      enableBackgroundPrefetch: false, // Disable for tests
      enableNavigationPatterns: true
    })

    mockFetchFn = jest.fn().mockImplementation((path: string) => 
      Promise.resolve(createMockContents(path))
    )

    // Clear localStorage mocks
    localStorageMock.getItem.mockClear()
    localStorageMock.setItem.mockClear()
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('Basic Cache Operations', () => {
    it('should store and retrieve directory contents', () => {
      const contents = createMockContents('/test')
      cache.set('/test', contents)

      const retrieved = cache.get('/test')
      expect(retrieved).toEqual(contents)
    })

    it('should return null for non-existent paths', () => {
      const result = cache.get('/nonexistent')
      expect(result).toBeNull()
    })

    it('should invalidate specific cache entries', () => {
      const contents = createMockContents('/test')
      cache.set('/test', contents)
      
      expect(cache.get('/test')).toEqual(contents)
      
      cache.invalidate('/test')
      expect(cache.get('/test')).toBeNull()
    })

    it('should clear all cache entries', () => {
      cache.set('/test1', createMockContents('/test1'))
      cache.set('/test2', createMockContents('/test2'))
      
      expect(cache.get('/test1')).toBeTruthy()
      expect(cache.get('/test2')).toBeTruthy()
      
      cache.clear()
      expect(cache.get('/test1')).toBeNull()
      expect(cache.get('/test2')).toBeNull()
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when cache is full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 5; i++) {
        cache.set(`/test${i}`, createMockContents(`/test${i}`))
      }

      // All entries should be present
      for (let i = 0; i < 5; i++) {
        expect(cache.get(`/test${i}`)).toBeTruthy()
      }

      // Add one more entry, should evict the first one
      cache.set('/test5', createMockContents('/test5'))
      
      expect(cache.get('/test0')).toBeNull() // Should be evicted
      expect(cache.get('/test5')).toBeTruthy() // Should be present
    })

    it('should update access order when retrieving entries', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set(`/test${i}`, createMockContents(`/test${i}`))
      }

      // Access the first entry to make it most recently used
      cache.get('/test0')

      // Add new entry, should evict test1 (now least recently used)
      cache.set('/test5', createMockContents('/test5'))
      
      expect(cache.get('/test0')).toBeTruthy() // Should still be present
      expect(cache.get('/test1')).toBeNull() // Should be evicted
    })
  })

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      const contents = createMockContents('/test')
      cache.set('/test', contents)
      
      expect(cache.get('/test')).toBeTruthy()
      
      // Mock time passing beyond TTL (1 minute = 60000ms)
      const originalNow = Date.now
      Date.now = jest.fn(() => originalNow() + 70000)
      
      expect(cache.get('/test')).toBeNull()
      
      // Restore Date.now
      Date.now = originalNow
    })
  })

  describe('Preloading', () => {
    it('should preload multiple paths', async () => {
      const paths = ['/test1', '/test2', '/test3']
      
      await cache.preload(paths, mockFetchFn, 'parent')
      
      expect(mockFetchFn).toHaveBeenCalledTimes(3)
      expect(cache.get('/test1')).toBeTruthy()
      expect(cache.get('/test2')).toBeTruthy()
      expect(cache.get('/test3')).toBeTruthy()
    })

    it('should not preload already cached paths', async () => {
      cache.set('/test1', createMockContents('/test1'))
      
      const paths = ['/test1', '/test2']
      await cache.preload(paths, mockFetchFn, 'parent')
      
      expect(mockFetchFn).toHaveBeenCalledTimes(1)
      expect(mockFetchFn).toHaveBeenCalledWith('/test2')
    })

    it('should handle preload failures gracefully', async () => {
      mockFetchFn.mockRejectedValueOnce(new Error('Network error'))
      
      const paths = ['/test1', '/test2']
      await cache.preload(paths, mockFetchFn, 'parent')
      
      expect(cache.get('/test1')).toBeNull() // Failed to load
      expect(cache.get('/test2')).toBeTruthy() // Successfully loaded
    })
  })

  describe('Navigation Patterns', () => {
    it('should record navigation patterns', () => {
      // Simulate navigation pattern
      cache.set('/parent', createMockContents('/parent'))
      cache.get('/parent') // Access parent first
      
      cache.set('/child', createMockContents('/child'))
      cache.get('/child') // Then access child
      
      const patterns = cache.getNavigationPatterns()
      expect(patterns).toHaveLength(1)
      expect(patterns[0].fromPath).toBe('/parent')
      expect(patterns[0].toPath).toBe('/child')
      expect(patterns[0].frequency).toBe(1)
    })

    it('should predict next paths based on patterns', () => {
      // Create a pattern by accessing paths in sequence multiple times
      for (let i = 0; i < 3; i++) {
        cache.set('/parent', createMockContents('/parent'))
        cache.get('/parent')
        
        cache.set('/child', createMockContents('/child'))
        cache.get('/child')
      }
      
      const preloadPaths = cache.getPreloadPaths('/parent')
      expect(preloadPaths).toContain('/child')
    })

    it('should save and load navigation patterns', () => {
      // Set up a pattern
      cache.set('/parent', createMockContents('/parent'))
      cache.get('/parent')
      cache.set('/child', createMockContents('/child'))
      cache.get('/child')
      
      // Destroy cache (should save patterns)
      cache.destroy()
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'directory-cache-navigation-patterns',
        expect.any(String)
      )
    })
  })

  describe('Cache Statistics', () => {
    it('should track hit rate correctly', () => {
      cache.set('/test', createMockContents('/test'))
      
      // Miss
      cache.get('/nonexistent')
      let stats = cache.getStats()
      expect(stats.hitRate).toBe(0)
      
      // Hit
      cache.get('/test')
      stats = cache.getStats()
      expect(stats.hitRate).toBe(0.5) // 1 hit out of 2 requests
    })

    it('should track memory usage', () => {
      const stats = cache.getStats()
      expect(stats.memoryUsage).toBe(0)
      
      cache.set('/test', createMockContents('/test'))
      const updatedStats = cache.getStats()
      expect(updatedStats.memoryUsage).toBeGreaterThan(0)
    })

    it('should track preload hits', async () => {
      await cache.preload(['/test'], mockFetchFn, 'parent')
      
      // Access the preloaded path
      cache.get('/test')
      
      const stats = cache.getStats()
      expect(stats.preloadHits).toBe(1)
    })
  })

  describe('Cache Warming', () => {
    it('should warm cache based on patterns', async () => {
      // Create a navigation pattern
      cache.set('/parent', createMockContents('/parent'))
      cache.get('/parent')
      cache.set('/child', createMockContents('/child'))
      cache.get('/child')
      
      // Clear cache and warm it
      cache.clear()
      await cache.warmCache('/parent', mockFetchFn)
      
      expect(mockFetchFn).toHaveBeenCalled()
    })

    it('should get preload paths including siblings', () => {
      // Set up parent with folders
      const parentContents = createMockContents('/parent')
      parentContents.folders = [
        { id: '1', name: 'child1', path: '/parent/child1' },
        { id: '2', name: 'child2', path: '/parent/child2' },
        { id: '3', name: 'child3', path: '/parent/child3' }
      ]
      cache.set('/parent', parentContents)
      
      const preloadPaths = cache.getPreloadPaths('/parent/child1')
      
      // Should include parent and siblings
      expect(preloadPaths).toContain('/parent')
      expect(preloadPaths).toContain('/parent/child2')
      expect(preloadPaths).toContain('/parent/child3')
      expect(preloadPaths).not.toContain('/parent/child1') // Not itself
    })
  })

  describe('Performance Tracking', () => {
    it('should record load times', () => {
      const loadTime = 150
      cache.set('/test', createMockContents('/test'), loadTime)
      
      const stats = cache.getStats()
      expect(stats.averageLoadTime).toBe(loadTime)
    })

    it('should calculate cache efficiency', () => {
      // Add some entries and access them
      cache.set('/test1', createMockContents('/test1'))
      cache.set('/test2', createMockContents('/test2'))
      
      cache.get('/test1') // Hit
      cache.get('/test2') // Hit
      cache.get('/nonexistent') // Miss
      
      const stats = cache.getStats()
      expect(stats.cacheEfficiency).toBeGreaterThan(0)
    })
  })
})