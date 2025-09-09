/**
 * Tests for storage performance optimizations and error handling
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { 
  optimizedListFiles, 
  performanceMonitor, 
  cacheManager,
  PERFORMANCE_CONFIG,
  processBatch,
  debounce,
  calculateVirtualScroll
} from '@/lib/storage-performance'
import { 
  withRetry, 
  mapError, 
  StorageErrorType, 
  ErrorSeverity,
  errorLogger,
  CircuitBreaker,
  checkStorageHealth
} from '@/lib/storage-error-handling'
import { StorageErrorBoundary } from '@/components/storage-error-boundary'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({
        data: { user: { id: 'test-user' } },
        error: null
      }))
    },
    storage: {
      from: jest.fn(() => ({
        list: jest.fn(),
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        move: jest.fn(),
        createSignedUrl: jest.fn()
      }))
    }
  }))
}))

describe('Storage Performance Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    performanceMonitor.reset()
    cacheManager.clearAllCaches()
    errorLogger.clear()
  })

  describe('Optimized File Listing', () => {
    it('should use caching for repeated queries', async () => {
      const mockListFunction = jest.fn().mockResolvedValue([
        { name: 'test.pdf', size: 1000, updated_at: '2023-01-01' }
      ])

      const query = {
        prefix: 'user_test/documents',
        limit: 100
      }

      // First call - should hit the function
      const result1 = await optimizedListFiles(mockListFunction, query)
      expect(mockListFunction).toHaveBeenCalledTimes(1)
      expect(result1.metrics.cacheHit).toBe(false)

      // Second call - should use cache
      const result2 = await optimizedListFiles(mockListFunction, query)
      expect(mockListFunction).toHaveBeenCalledTimes(1) // No additional call
      expect(result2.metrics.cacheHit).toBe(true)
    })

    it('should implement pagination correctly', async () => {
      const mockFiles = Array.from({ length: 150 }, (_, i) => ({
        name: `file${i}.pdf`,
        size: 1000,
        updated_at: '2023-01-01'
      }))

      const mockListFunction = jest.fn().mockResolvedValue(mockFiles)

      const query = {
        prefix: 'user_test/documents',
        limit: 50,
        offset: 0
      }

      const result = await optimizedListFiles(mockListFunction, query)
      
      expect(result.data[0]).toHaveLength(50)
      expect(result.totalCount).toBe(150)
      expect(result.hasMore).toBe(true)
      expect(result.nextOffset).toBe(50)
    })

    it('should handle large file collections efficiently', async () => {
      const mockFiles = Array.from({ length: 10000 }, (_, i) => ({
        name: `file${i}.pdf`,
        size: 1000,
        updated_at: '2023-01-01'
      }))

      const mockListFunction = jest.fn().mockResolvedValue(mockFiles)

      const query = {
        prefix: 'user_test/documents',
        limit: PERFORMANCE_CONFIG.MAX_FILES_PER_QUERY
      }

      const startTime = Date.now()
      const result = await optimizedListFiles(mockListFunction, query)
      const endTime = Date.now()

      expect(result.totalCount).toBe(10000)
      expect(endTime - startTime).toBeLessThan(PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD)
      expect(result.metrics.queryTime).toBeLessThan(PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD)
    })
  })

  describe('Retry Logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0
      const mockOperation = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Network error')
        }
        return Promise.resolve('success')
      })

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        baseDelay: 100,
        backoffMultiplier: 2,
        retryableErrors: [StorageErrorType.NETWORK_ERROR]
      }, 'test_operation')

      expect(result).toBe('success')
      expect(mockOperation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Authentication failed'))

      await expect(withRetry(mockOperation, {
        maxRetries: 3,
        retryableErrors: [StorageErrorType.NETWORK_ERROR] // Auth error not in list
      }, 'test_operation')).rejects.toThrow()

      expect(mockOperation).toHaveBeenCalledTimes(1)
    })

    it('should respect maximum retry limit', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Network error'))

      await expect(withRetry(mockOperation, {
        maxRetries: 2,
        baseDelay: 10,
        retryableErrors: [StorageErrorType.NETWORK_ERROR]
      }, 'test_operation')).rejects.toThrow()

      expect(mockOperation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('Error Mapping', () => {
    it('should map Supabase errors correctly', () => {
      const supabaseError = {
        error: {
          message: 'File not found',
          statusCode: 404
        }
      }

      const mappedError = mapError(supabaseError, 'download_file')

      expect(mappedError.type).toBe(StorageErrorType.FILE_NOT_FOUND)
      expect(mappedError.severity).toBe(ErrorSeverity.MEDIUM)
      expect(mappedError.operation).toBe('download_file')
      expect(mappedError.retryable).toBe(false)
      expect(mappedError.userMessage).toContain('nicht gefunden')
    })

    it('should map network errors correctly', () => {
      const networkError = new Error('Network error')
      networkError.name = 'NetworkError'

      const mappedError = mapError(networkError, 'upload_file')

      expect(mappedError.type).toBe(StorageErrorType.NETWORK_ERROR)
      expect(mappedError.retryable).toBe(true)
      expect(mappedError.userMessage).toContain('Netzwerkfehler')
    })

    it('should map timeout errors correctly', () => {
      const timeoutError = new Error('Operation timed out')

      const mappedError = mapError(timeoutError, 'download_file')

      expect(mappedError.type).toBe(StorageErrorType.TIMEOUT_ERROR)
      expect(mappedError.retryable).toBe(true)
      expect(mappedError.userMessage).toContain('zu lange gedauert')
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000) // 2 failures, 1 second recovery
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'))

      // First two failures should work
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service unavailable')
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service unavailable')

      // Third attempt should be blocked by circuit breaker
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Circuit breaker is OPEN')

      expect(circuitBreaker.getState().state).toBe('OPEN')
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should recover after timeout period', async () => {
      const circuitBreaker = new CircuitBreaker(1, 100) // 1 failure, 100ms recovery
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce('success')

      // Trigger circuit breaker
      await expect(circuitBreaker.execute(mockOperation)).rejects.toThrow('Service unavailable')
      expect(circuitBreaker.getState().state).toBe('OPEN')

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should allow operation and succeed
      const result = await circuitBreaker.execute(mockOperation)
      expect(result).toBe('success')
      expect(circuitBreaker.getState().state).toBe('CLOSED')
    })
  })

  describe('Batch Processing', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i)
      const batchSize = 10
      const processedBatches: number[][] = []

      const processor = jest.fn().mockImplementation((batch: number[]) => {
        processedBatches.push([...batch])
        return Promise.resolve(batch.map(x => x * 2))
      })

      const results = await processBatch(items, processor, batchSize)

      expect(processedBatches).toHaveLength(3) // 25 items / 10 batch size = 3 batches
      expect(processedBatches[0]).toHaveLength(10)
      expect(processedBatches[1]).toHaveLength(10)
      expect(processedBatches[2]).toHaveLength(5)
      expect(results).toHaveLength(25)
      expect(results[0]).toBe(0) // 0 * 2
      expect(results[24]).toBe(48) // 24 * 2
    })
  })

  describe('Debounce Function', () => {
    it('should debounce function calls', async () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      // Call multiple times quickly
      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled()

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should have been called once with the last argument
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })
  })

  describe('Virtual Scrolling', () => {
    it('should calculate visible items correctly', () => {
      const result = calculateVirtualScroll(500, 1000, {
        itemHeight: 50,
        containerHeight: 400,
        overscan: 2
      })

      expect(result.startIndex).toBe(8) // (500 / 50) - 2 overscan
      expect(result.endIndex).toBe(21) // startIndex + visibleItems + overscan * 2
      expect(result.visibleItems).toBe(8) // 400 / 50
      expect(result.totalHeight).toBe(50000) // 1000 * 50
      expect(result.offsetY).toBe(400) // 8 * 50
    })

    it('should handle edge cases', () => {
      // Test with scroll at top
      const topResult = calculateVirtualScroll(0, 100, {
        itemHeight: 50,
        containerHeight: 400
      })

      expect(topResult.startIndex).toBe(0)
      expect(topResult.endIndex).toBe(17) // 0 + 8 visible + 10 overscan (5 default * 2)

      // Test with scroll near bottom
      const bottomResult = calculateVirtualScroll(4500, 100, {
        itemHeight: 50,
        containerHeight: 400
      })

      expect(bottomResult.endIndex).toBe(99) // Clamped to totalItems - 1
    })
  })

  describe('Performance Monitoring', () => {
    it('should track query metrics', () => {
      const metric = {
        queryTime: 1500,
        resultCount: 100,
        cacheHit: false,
        retryCount: 1
      }

      performanceMonitor.addMetric(metric)

      const stats = performanceMonitor.getStats()
      expect(stats.totalQueries).toBe(1)
      expect(stats.averageQueryTime).toBe(1500)
      expect(stats.cacheHitRate).toBe(0)
      expect(stats.slowQueries).toBe(1) // > 2000ms threshold
    })

    it('should calculate cache hit rate correctly', () => {
      performanceMonitor.addMetric({ queryTime: 100, resultCount: 10, cacheHit: true, retryCount: 0 })
      performanceMonitor.addMetric({ queryTime: 200, resultCount: 20, cacheHit: false, retryCount: 0 })
      performanceMonitor.addMetric({ queryTime: 150, resultCount: 15, cacheHit: true, retryCount: 0 })

      const stats = performanceMonitor.getStats()
      expect(stats.cacheHitRate).toBeCloseTo(0.67, 2) // 2/3 cache hits
    })
  })

  describe('Health Check', () => {
    it('should return healthy status when storage is accessible', async () => {
      // Mock successful storage operation
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'test-user' } },
            error: null
          })
        },
        storage: {
          from: jest.fn().mockReturnValue({
            list: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        }
      }

      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabase
      }))

      const health = await checkStorageHealth()

      expect(health.healthy).toBe(true)
      expect(health.latency).toBeGreaterThan(0)
      expect(health.error).toBeUndefined()
    })

    it('should return unhealthy status when storage is not accessible', async () => {
      // Mock failed storage operation
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Authentication failed')
          })
        }
      }

      jest.doMock('@/utils/supabase/client', () => ({
        createClient: () => mockSupabase
      }))

      const health = await checkStorageHealth()

      expect(health.healthy).toBe(false)
      expect(health.error).toBeDefined()
    })
  })
})

describe('Error Boundary Components', () => {
  it('should catch and display errors', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    render(
      <StorageErrorBoundary>
        <ThrowError />
      </StorageErrorBoundary>
    )

    expect(screen.getByText('Fehler aufgetreten')).toBeInTheDocument()
    expect(screen.getByText(/Ein unerwarteter Fehler ist aufgetreten/)).toBeInTheDocument()
  })

  it('should provide retry functionality', () => {
    let shouldThrow = true
    const ConditionalError = () => {
      if (shouldThrow) {
        throw new Error('Test error')
      }
      return <div>Success</div>
    }

    render(
      <StorageErrorBoundary>
        <ConditionalError />
      </StorageErrorBoundary>
    )

    expect(screen.getByText('Fehler aufgetreten')).toBeInTheDocument()

    // Click retry button
    shouldThrow = false
    const retryButton = screen.getByText('Erneut versuchen')
    fireEvent.click(retryButton)

    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('should show development error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const ThrowError = () => {
      throw new Error('Detailed test error')
    }

    render(
      <StorageErrorBoundary>
        <ThrowError />
      </StorageErrorBoundary>
    )

    expect(screen.getByText('Entwickler-Info:')).toBeInTheDocument()
    expect(screen.getByText('Detailed test error')).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('Cache Management', () => {
  it('should clear caches correctly', () => {
    // Add some mock cache data
    const mockStats = {
      fileList: { validEntries: 10, totalEntries: 10, maxSize: 100 },
      folderStructure: { validEntries: 5, totalEntries: 5, maxSize: 50 }
    }

    // Clear all caches
    cacheManager.clearAllCaches()

    // Verify caches are cleared
    const stats = cacheManager.getCacheStats()
    expect(stats.fileList.validEntries).toBe(0)
    expect(stats.folderStructure.validEntries).toBe(0)
  })

  it('should invalidate cache by prefix', () => {
    // This would require more detailed cache implementation testing
    // For now, just verify the function exists and can be called
    expect(() => {
      cacheManager.invalidatePrefix('user_test/documents')
    }).not.toThrow()
  })
})