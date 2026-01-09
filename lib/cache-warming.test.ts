import { CacheWarmingManager } from '@/lib/cache-warming'
import { getDirectoryCache } from '@/lib/directory-cache'

// Mock the directory cache
jest.mock('@/lib/directory-cache', () => ({
  getDirectoryCache: jest.fn()
}))

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  getNavigationPatterns: jest.fn(),
  getPreloadPaths: jest.fn(),
  getStats: jest.fn(() => ({
    hitRate: 0.8,
    totalRequests: 100,
    totalHits: 80,
    totalMisses: 20,
    memoryUsage: 1024 * 1024,
    entryCount: 10,
    preloadHits: 5,
    backgroundPrefetchCount: 3,
    navigationPatternAccuracy: 60,
    averageLoadTime: 150,
    cacheEfficiency: 75
  }))
}

const mockGetDirectoryCache = getDirectoryCache as jest.MockedFunction<typeof getDirectoryCache>

describe('CacheWarmingManager', () => {
  let warmingManager: CacheWarmingManager
  let mockFetchFn: jest.Mock

  beforeEach(() => {
    mockGetDirectoryCache.mockReturnValue(mockCache as any)
    
    warmingManager = new CacheWarmingManager({
      maxConcurrentRequests: 2,
      priorityThreshold: 0, // Allow all priorities for testing
      idleTimeRequired: 100, // Short idle time for testing
      maxWarmingTime: 5000
    })

    mockFetchFn = jest.fn().mockImplementation((path: string) => 
      Promise.resolve({ path, data: `mock-data-${path}` })
    )

    // Reset mocks
    Object.values(mockCache).forEach(mock => {
      if (typeof mock.mockClear === 'function') {
        mock.mockClear()
      }
    })
    
    // Set default return values
    mockCache.getNavigationPatterns.mockReturnValue([])
    mockCache.getPreloadPaths.mockReturnValue([])
  })

  afterEach(() => {
    warmingManager.destroy()
  })

  describe('Activity Recording', () => {
    it('should record user activity', () => {
      const initialTime = Date.now()
      warmingManager.recordActivity()
      
      const stats = warmingManager.getWarmingStats()
      expect(stats.lastActivity).toBeGreaterThanOrEqual(initialTime)
    })

    it('should reset idle timer on activity', (done) => {
      warmingManager.recordActivity()
      
      // Wait less than idle time and record activity again
      setTimeout(() => {
        warmingManager.recordActivity()
        
        // Should not trigger idle state yet
        const stats = warmingManager.getWarmingStats()
        expect(stats.idleTime).toBeLessThan(100)
        done()
      }, 50)
    })
  })

  describe('Path Warming', () => {
    it('should warm specified paths', async () => {
      mockCache.get.mockReturnValue(null) // Not cached
      
      const paths = ['/test1', '/test2', '/test3']
      await warmingManager.warmPaths(paths, mockFetchFn)
      
      expect(mockFetchFn).toHaveBeenCalledTimes(3)
      expect(mockCache.set).toHaveBeenCalledTimes(3)
    })

    it('should skip already cached paths', async () => {
      mockCache.get.mockImplementation((path: string) => 
        path === '/test1' ? { cached: true } : null
      )
      
      const paths = ['/test1', '/test2', '/test3']
      await warmingManager.warmPaths(paths, mockFetchFn)
      
      expect(mockFetchFn).toHaveBeenCalledTimes(2) // Only test2 and test3
      expect(mockFetchFn).not.toHaveBeenCalledWith('/test1')
    })

    it('should handle fetch failures gracefully', async () => {
      mockCache.get.mockReturnValue(null)
      mockFetchFn.mockRejectedValueOnce(new Error('Network error'))
      
      const paths = ['/test1', '/test2']
      await warmingManager.warmPaths(paths, mockFetchFn)
      
      expect(mockFetchFn).toHaveBeenCalledTimes(2)
      expect(mockCache.set).toHaveBeenCalledTimes(1) // Only successful one
    })

    it('should respect concurrent request limits', async () => {
      mockCache.get.mockReturnValue(null)
      
      let concurrentRequests = 0
      let maxConcurrent = 0
      
      mockFetchFn.mockImplementation(async (path: string) => {
        concurrentRequests++
        maxConcurrent = Math.max(maxConcurrent, concurrentRequests)
        
        await new Promise(resolve => setTimeout(resolve, 50))
        
        concurrentRequests--
        return { path, data: `mock-data-${path}` }
      })
      
      const paths = ['/test1', '/test2', '/test3', '/test4', '/test5']
      await warmingManager.warmPaths(paths, mockFetchFn)
      
      expect(maxConcurrent).toBeLessThanOrEqual(2) // Should respect limit
    })
  })

  describe('Pattern-Based Warming', () => {
    it('should warm paths based on navigation patterns', async () => {
      mockCache.get.mockReturnValue(null)
      mockCache.getNavigationPatterns.mockReturnValue([
        {
          fromPath: '/parent',
          toPath: '/child1',
          frequency: 5,
          lastAccess: Date.now(),
          averageTime: 1000
        },
        {
          fromPath: '/parent',
          toPath: '/child2',
          frequency: 3,
          lastAccess: Date.now() - 10000,
          averageTime: 1500
        }
      ])
      
      await warmingManager.warmFromPatterns('/parent', mockFetchFn)
      
      expect(mockFetchFn).toHaveBeenCalledWith('/child1')
      expect(mockFetchFn).toHaveBeenCalledWith('/child2')
    })

    it('should prioritize frequent patterns', async () => {
      mockCache.get.mockReturnValue(null)
      mockCache.getNavigationPatterns.mockReturnValue([
        {
          fromPath: '/parent',
          toPath: '/frequent',
          frequency: 10,
          lastAccess: Date.now(),
          averageTime: 1000
        },
        {
          fromPath: '/parent',
          toPath: '/rare',
          frequency: 1,
          lastAccess: Date.now() - 100000,
          averageTime: 1500
        }
      ])
      
      const fetchOrder: string[] = []
      mockFetchFn.mockImplementation(async (path: string) => {
        fetchOrder.push(path)
        return { path, data: `mock-data-${path}` }
      })
      
      await warmingManager.warmFromPatterns('/parent', mockFetchFn)
      
      expect(fetchOrder[0]).toBe('/frequent') // Should be fetched first
    })
  })

  describe('Sibling Warming', () => {
    it('should warm sibling directories', async () => {
      mockCache.get.mockReturnValue(null)
      mockCache.getPreloadPaths.mockReturnValue([
        '/parent',
        '/parent/sibling1',
        '/parent/sibling2',
        '/parent/child/deep' // Different depth, should be filtered
      ])
      
      await warmingManager.warmSiblings('/parent/current', mockFetchFn)
      
      // Should only warm siblings at same depth level
      expect(mockFetchFn).toHaveBeenCalledWith('/parent/sibling1')
      expect(mockFetchFn).toHaveBeenCalledWith('/parent/sibling2')
      expect(mockFetchFn).not.toHaveBeenCalledWith('/parent')
      expect(mockFetchFn).not.toHaveBeenCalledWith('/parent/child/deep')
    })
  })

  describe('Warming Control', () => {
    it('should stop warming when requested', async () => {
      mockCache.get.mockReturnValue(null)
      
      let fetchCount = 0
      mockFetchFn.mockImplementation(async (path: string) => {
        fetchCount++
        if (fetchCount === 2) {
          warmingManager.stopWarming()
        }
        await new Promise(resolve => setTimeout(resolve, 100))
        return { path, data: `mock-data-${path}` }
      })
      
      const paths = ['/test1', '/test2', '/test3', '/test4']
      await warmingManager.warmPaths(paths, mockFetchFn)
      
      expect(fetchCount).toBeLessThan(4) // Should have stopped early
    })

    it('should report warming status', async () => {
      mockCache.get.mockReturnValue(null)
      
      expect(warmingManager.isWarmingActive()).toBe(false)
      
      const warmingPromise = warmingManager.warmPaths(['/test'], mockFetchFn)
      expect(warmingManager.isWarmingActive()).toBe(true)
      
      await warmingPromise
      expect(warmingManager.isWarmingActive()).toBe(false)
    })
  })

  describe('Priority Calculation', () => {
    it('should calculate warming priorities correctly', async () => {
      mockCache.get.mockReturnValue(null)
      mockCache.getNavigationPatterns.mockReturnValue([
        {
          fromPath: '/current',
          toPath: '/high-priority',
          frequency: 10,
          lastAccess: Date.now() - 1000, // Recent
          averageTime: 1000
        }
      ])
      
      const fetchOrder: string[] = []
      mockFetchFn.mockImplementation(async (path: string) => {
        fetchOrder.push(path)
        return { path, data: `mock-data-${path}` }
      })
      
      // Warm with different reasons to test priority
      await warmingManager.warmPaths(['/low-priority'], mockFetchFn, 'idle')
      await warmingManager.warmPaths(['/high-priority'], mockFetchFn, 'manual')
      
      // Manual should have higher priority than idle
      expect(fetchOrder).toEqual(['/low-priority', '/high-priority'])
    })
  })

  describe('Statistics', () => {
    it('should provide warming statistics', () => {
      const stats = warmingManager.getWarmingStats()
      
      expect(stats).toHaveProperty('isWarming')
      expect(stats).toHaveProperty('lastActivity')
      expect(stats).toHaveProperty('idleTime')
      expect(typeof stats.isWarming).toBe('boolean')
      expect(typeof stats.lastActivity).toBe('number')
      expect(typeof stats.idleTime).toBe('number')
    })

    it('should track idle time correctly', (done) => {
      warmingManager.recordActivity()
      
      setTimeout(() => {
        const stats = warmingManager.getWarmingStats()
        expect(stats.idleTime).toBeGreaterThanOrEqual(50)
        done()
      }, 60)
    })
  })

  describe('Resource Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      const spy = jest.spyOn(warmingManager, 'stopWarming')
      
      warmingManager.destroy()
      
      expect(spy).toHaveBeenCalled()
    })
  })
})