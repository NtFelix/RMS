/**
 * Cache Warming Utilities
 * Provides intelligent cache warming strategies based on user behavior
 */

import { getDirectoryCache } from './directory-cache'

export interface CacheWarmingOptions {
  maxConcurrentRequests: number
  priorityThreshold: number
  idleTimeRequired: number
  maxWarmingTime: number
}

const DEFAULT_WARMING_OPTIONS: CacheWarmingOptions = {
  maxConcurrentRequests: 2,
  priorityThreshold: 50,
  idleTimeRequired: 3000, // 3 seconds
  maxWarmingTime: 30000 // 30 seconds
}

export class CacheWarmingManager {
  private options: CacheWarmingOptions
  private isWarming = false
  private warmingAbortController?: AbortController
  private idleTimer?: NodeJS.Timeout
  private lastActivity = Date.now()

  constructor(options: Partial<CacheWarmingOptions> = {}) {
    this.options = { ...DEFAULT_WARMING_OPTIONS, ...options }
    this.startIdleMonitoring()
  }

  /**
   * Record user activity to reset idle timer
   */
  recordActivity(): void {
    this.lastActivity = Date.now()
    this.resetIdleTimer()
    
    // Stop current warming if user becomes active
    if (this.isWarming) {
      this.stopWarming()
    }
  }

  /**
   * Manually trigger cache warming for specific paths
   */
  async warmPaths(
    paths: string[], 
    fetchFn: (path: string) => Promise<any>,
    reason: 'manual' | 'idle' | 'pattern' = 'manual'
  ): Promise<void> {
    if (this.isWarming) {
      return
    }

    this.isWarming = true
    this.warmingAbortController = new AbortController()

    try {
      const cache = getDirectoryCache()
      
      // Filter paths that aren't already cached
      const pathsToWarm = paths.filter(path => !cache.get(path))
      
      if (pathsToWarm.length === 0) {
        return
      }

      // Sort paths by priority
      const prioritizedPaths = pathsToWarm
        .map(path => ({
          path,
          priority: this.calculateWarmingPriority(path, reason)
        }))
        .filter(item => item.priority >= this.options.priorityThreshold)
        .sort((a, b) => b.priority - a.priority)

      // Warm cache in batches
      const batches = this.chunkArray(prioritizedPaths, this.options.maxConcurrentRequests)
      
      for (const batch of batches) {
        if (this.warmingAbortController.signal.aborted) {
          break
        }

        const warmingPromises = batch.map(async ({ path }) => {
          if (this.warmingAbortController?.signal.aborted) {
            return
          }

          try {
            const contents = await fetchFn(path)
            cache.set(path, contents)
          } catch (error) {
            console.warn(`Cache warming failed for ${path}:`, error)
          }
        })

        await Promise.allSettled(warmingPromises)
        
        // Small delay between batches to avoid overwhelming the system
        if (!this.warmingAbortController.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } finally {
      this.isWarming = false
      this.warmingAbortController = undefined
    }
  }

  /**
   * Warm cache based on navigation patterns
   */
  async warmFromPatterns(
    currentPath: string,
    fetchFn: (path: string) => Promise<any>
  ): Promise<void> {
    const cache = getDirectoryCache()
    const patterns = cache.getNavigationPatterns()
    
    // Find patterns that start from current path
    const relevantPatterns = patterns
      .filter(pattern => pattern.fromPath === currentPath)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3) // Top 3 most frequent patterns

    const pathsToWarm = relevantPatterns.map(pattern => pattern.toPath)
    
    if (pathsToWarm.length > 0) {
      await this.warmPaths(pathsToWarm, fetchFn, 'pattern')
    }
  }

  /**
   * Warm cache with sibling directories
   */
  async warmSiblings(
    currentPath: string,
    fetchFn: (path: string) => Promise<any>
  ): Promise<void> {
    const cache = getDirectoryCache()
    const preloadPaths = cache.getPreloadPaths(currentPath)
    
    // Filter to only sibling paths (same depth level)
    const currentDepth = currentPath.split('/').length
    const siblingPaths = preloadPaths.filter(path => {
      const pathDepth = path.split('/').length
      return pathDepth === currentDepth && path !== currentPath
    })

    if (siblingPaths.length > 0) {
      await this.warmPaths(siblingPaths, fetchFn, 'idle')
    }
  }

  /**
   * Stop current warming operation
   */
  stopWarming(): void {
    if (this.warmingAbortController) {
      this.warmingAbortController.abort()
    }
    this.isWarming = false
  }

  /**
   * Check if cache warming is currently active
   */
  isWarmingActive(): boolean {
    return this.isWarming
  }

  /**
   * Get warming statistics
   */
  getWarmingStats() {
    const cache = getDirectoryCache()
    const stats = cache.getStats()
    
    return {
      isWarming: this.isWarming,
      lastActivity: this.lastActivity,
      idleTime: Date.now() - this.lastActivity,
      backgroundPrefetchCount: stats.backgroundPrefetchCount,
      cacheEfficiency: stats.cacheEfficiency,
      navigationPatternCount: cache.getNavigationPatterns().length
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopWarming()
    
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
  }

  // Private methods

  private startIdleMonitoring(): void {
    this.resetIdleTimer()
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    this.idleTimer = setTimeout(() => {
      this.handleIdleState()
    }, this.options.idleTimeRequired)
  }

  private async handleIdleState(): Promise<void> {
    if (this.isWarming) {
      return
    }

    // Get current path from cache (last accessed)
    const cache = getDirectoryCache()
    const patterns = cache.getNavigationPatterns()
    
    if (patterns.length === 0) {
      return
    }

    // Find the most recently accessed path
    const recentPattern = patterns
      .sort((a, b) => b.lastAccess - a.lastAccess)[0]
    
    if (recentPattern) {
      // This would need to be called with actual fetch function
      // await this.warmFromPatterns(recentPattern.fromPath, fetchFn)
    }
  }

  private calculateWarmingPriority(path: string, reason: 'manual' | 'idle' | 'pattern'): number {
    let priority = 0

    // Base priority by reason
    switch (reason) {
      case 'manual':
        priority = 100
        break
      case 'pattern':
        priority = 80
        break
      case 'idle':
        priority = 60
        break
    }

    // Boost priority based on navigation patterns
    const cache = getDirectoryCache()
    const patterns = cache.getNavigationPatterns()
    
    const relevantPattern = patterns.find(pattern => pattern.toPath === path)
    if (relevantPattern) {
      priority += Math.min(20, relevantPattern.frequency * 2)
      
      // Boost for recent patterns
      const age = Date.now() - relevantPattern.lastAccess
      if (age < 300000) { // Less than 5 minutes
        priority += 10
      }
    }

    // Reduce priority for paths that might be expensive to load
    const pathDepth = path.split('/').length
    if (pathDepth > 5) {
      priority -= 10 // Deep paths might be slower
    }

    return Math.max(0, priority)
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Global cache warming manager instance
let globalWarmingManager: CacheWarmingManager | null = null

export function getCacheWarmingManager(options?: Partial<CacheWarmingOptions>): CacheWarmingManager {
  if (!globalWarmingManager) {
    globalWarmingManager = new CacheWarmingManager(options)
  }
  return globalWarmingManager
}

export function resetCacheWarmingManager(): void {
  if (globalWarmingManager) {
    globalWarmingManager.destroy()
    globalWarmingManager = null
  }
}

// React hook for cache warming
export function useCacheWarming() {
  const warmingManager = getCacheWarmingManager()
  
  return {
    recordActivity: () => warmingManager.recordActivity(),
    warmPaths: (paths: string[], fetchFn: (path: string) => Promise<any>) => 
      warmingManager.warmPaths(paths, fetchFn),
    warmFromPatterns: (currentPath: string, fetchFn: (path: string) => Promise<any>) =>
      warmingManager.warmFromPatterns(currentPath, fetchFn),
    warmSiblings: (currentPath: string, fetchFn: (path: string) => Promise<any>) =>
      warmingManager.warmSiblings(currentPath, fetchFn),
    stopWarming: () => warmingManager.stopWarming(),
    isWarmingActive: () => warmingManager.isWarmingActive(),
    getWarmingStats: () => warmingManager.getWarmingStats()
  }
}