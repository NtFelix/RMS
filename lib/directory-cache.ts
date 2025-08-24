/**
 * Directory Cache Manager with LRU eviction
 * Provides intelligent caching for cloud storage directory contents
 */

export interface DirectoryContents {
  files: StorageFile[]
  folders: VirtualFolder[]
  breadcrumbs: BreadcrumbItem[]
  timestamp: number
  error?: string
}

export interface StorageFile {
  id: string
  name: string
  size: number
  type: string
  lastModified: Date
  path: string
}

export interface VirtualFolder {
  id: string
  name: string
  path: string
  itemCount?: number
}

export interface BreadcrumbItem {
  id: string
  name: string
  path: string
}

export interface CacheEntry {
  data: DirectoryContents
  accessTime: number
  size: number // Memory size estimate in bytes
}

export interface CacheStats {
  hitRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  entryCount: number
  preloadHits: number
  backgroundPrefetchCount: number
  navigationPatternAccuracy: number
  averageLoadTime: number
  cacheEfficiency: number
}

export interface NavigationPattern {
  fromPath: string
  toPath: string
  frequency: number
  lastAccess: number
  averageTime: number
}

export interface PreloadRequest {
  path: string
  priority: number
  requestTime: number
  reason: 'parent' | 'sibling' | 'pattern' | 'idle'
}

export interface DirectoryCacheOptions {
  maxSize: number // Maximum number of entries
  maxMemoryMB: number // Maximum memory usage in MB
  ttlMinutes: number // Time to live in minutes
  enablePreloading: boolean
  enableMemoryMonitoring: boolean
  enableBackgroundPrefetch: boolean
  enableNavigationPatterns: boolean
  preloadSiblingCount: number // Number of sibling directories to preload
  idleTimeThreshold: number // Milliseconds of idle time before background prefetch
}

const DEFAULT_OPTIONS: DirectoryCacheOptions = {
  maxSize: 100,
  maxMemoryMB: 50,
  ttlMinutes: 5,
  enablePreloading: true,
  enableMemoryMonitoring: true,
  enableBackgroundPrefetch: true,
  enableNavigationPatterns: true,
  preloadSiblingCount: 3,
  idleTimeThreshold: 2000
}

export class DirectoryCacheManager {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = [] // For LRU tracking
  private options: DirectoryCacheOptions
  private stats: CacheStats = {
    hitRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    memoryUsage: 0,
    entryCount: 0,
    preloadHits: 0,
    backgroundPrefetchCount: 0,
    navigationPatternAccuracy: 0,
    averageLoadTime: 0,
    cacheEfficiency: 0
  }
  private memoryCleanupTimer?: NodeJS.Timeout
  private preloadQueue = new Set<string>()
  private navigationPatterns = new Map<string, NavigationPattern>()
  private pendingPreloads = new Map<string, PreloadRequest>()
  private idleTimer?: NodeJS.Timeout
  private lastActivity = Date.now()
  private loadTimes: number[] = []
  private backgroundPrefetchTimer?: NodeJS.Timeout
  private lastAccessedPath: string | null = null

  constructor(options: Partial<DirectoryCacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring()
    }
    
    if (this.options.enableBackgroundPrefetch) {
      this.startIdleMonitoring()
    }
    
    if (this.options.enableNavigationPatterns) {
      this.loadNavigationPatterns()
    }
  }

  /**
   * Get directory contents from cache
   */
  get(path: string): DirectoryContents | null {
    this.stats.totalRequests++
    this.recordActivity()
    
    const entry = this.cache.get(path)
    if (!entry) {
      this.stats.totalMisses++
      this.updateHitRate()
      this.recordNavigationPattern(path)
      return null
    }

    // Check if entry has expired
    const now = Date.now()
    const ttlMs = this.options.ttlMinutes * 60 * 1000
    if (now - entry.data.timestamp > ttlMs) {
      this.cache.delete(path)
      this.removeFromAccessOrder(path)
      this.stats.totalMisses++
      this.updateHitRate()
      this.recordNavigationPattern(path)
      return null
    }

    // Update access time and order for LRU
    entry.accessTime = now
    this.updateAccessOrder(path)
    
    this.stats.totalHits++
    
    // Check if this was a preload hit
    if (this.pendingPreloads.has(path)) {
      this.stats.preloadHits++
      this.pendingPreloads.delete(path)
    }
    
    this.updateHitRate()
    this.recordNavigationPattern(path)
    this.lastAccessedPath = path
    
    return entry.data
  }

  /**
   * Set directory contents in cache
   */
  set(path: string, contents: DirectoryContents, loadTime?: number): void {
    const now = Date.now()
    const size = this.estimateSize(contents)
    
    const entry: CacheEntry = {
      data: { ...contents, timestamp: now },
      accessTime: now,
      size
    }

    // Record load time for performance tracking
    if (loadTime !== undefined) {
      this.recordLoadTime(loadTime)
    }

    // Remove existing entry if it exists
    if (this.cache.has(path)) {
      this.cache.delete(path)
      this.removeFromAccessOrder(path)
    }

    // Check if we need to evict entries
    this.evictIfNecessary(size)

    // Add new entry
    this.cache.set(path, entry)
    this.accessOrder.push(path)
    
    this.updateStats()
    this.recordActivity()
    
    // Trigger intelligent preloading if enabled
    if (this.options.enablePreloading) {
      this.scheduleIntelligentPreloading(path)
    }
  }

  /**
   * Invalidate cache entry
   */
  invalidate(path: string): void {
    if (this.cache.has(path)) {
      this.cache.delete(path)
      this.removeFromAccessOrder(path)
      this.updateStats()
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.preloadQueue.clear()
    this.updateStats()
  }

  /**
   * Preload directory contents for given paths with priority
   */
  async preload(paths: string[], fetchFn: (path: string) => Promise<DirectoryContents>, reason: PreloadRequest['reason'] = 'parent'): Promise<void> {
    const preloadRequests: PreloadRequest[] = paths
      .filter(path => !this.cache.has(path) && !this.preloadQueue.has(path))
      .map(path => ({
        path,
        priority: this.calculatePreloadPriority(path, reason),
        requestTime: Date.now(),
        reason
      }))
      .sort((a, b) => b.priority - a.priority) // Sort by priority descending

    // Limit concurrent preloads to prevent overwhelming the system
    const maxConcurrent = 3
    const batches = this.chunkArray(preloadRequests, maxConcurrent)

    for (const batch of batches) {
      const preloadPromises = batch.map(async (request) => {
        this.preloadQueue.add(request.path)
        this.pendingPreloads.set(request.path, request)
        
        try {
          const startTime = performance.now()
          const contents = await fetchFn(request.path)
          const loadTime = performance.now() - startTime
          
          this.set(request.path, contents, loadTime)
          
          if (reason === 'idle') {
            this.stats.backgroundPrefetchCount++
          }
        } catch (error) {
          console.warn(`Failed to preload directory: ${request.path}`, error)
          this.pendingPreloads.delete(request.path)
        } finally {
          this.preloadQueue.delete(request.path)
        }
      })

      await Promise.allSettled(preloadPromises)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateCacheEfficiency()
    return { ...this.stats }
  }

  /**
   * Get navigation patterns for analysis
   */
  getNavigationPatterns(): NavigationPattern[] {
    return Array.from(this.navigationPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Get pending preload requests
   */
  getPendingPreloads(): PreloadRequest[] {
    return Array.from(this.pendingPreloads.values())
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * Warm cache with predicted paths based on navigation patterns
   */
  async warmCache(currentPath: string, fetchFn: (path: string) => Promise<DirectoryContents>): Promise<void> {
    if (!this.options.enableNavigationPatterns) {
      return
    }

    const predictedPaths = this.predictNextPaths(currentPath)
    if (predictedPaths.length > 0) {
      await this.preload(predictedPaths, fetchFn, 'pattern')
    }
  }

  /**
   * Get parent and sibling paths for preloading
   */
  getPreloadPaths(currentPath: string): string[] {
    const paths: string[] = []
    
    // Add parent directory
    const parentPath = this.getParentPath(currentPath)
    if (parentPath && parentPath !== currentPath) {
      paths.push(parentPath)
    }
    
    // Add sibling directories based on cached parent data
    if (parentPath) {
      const parentData = this.cache.get(parentPath)
      if (parentData) {
        const siblingPaths = parentData.data.folders
          .map(folder => folder.path)
          .filter(path => path !== currentPath)
          .slice(0, this.options.preloadSiblingCount)
        
        paths.push(...siblingPaths)
      }
    }
    
    // Add paths based on navigation patterns
    if (this.options.enableNavigationPatterns) {
      const patternPaths = this.predictNextPaths(currentPath)
      paths.push(...patternPaths.slice(0, 2)) // Limit pattern-based preloads
    }
    
    return [...new Set(paths)] // Remove duplicates
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }
    if (this.backgroundPrefetchTimer) {
      clearTimeout(this.backgroundPrefetchTimer)
    }
    
    this.saveNavigationPatterns()
    this.clear()
  }

  // Private methods

  private evictIfNecessary(newEntrySize: number): void {
    const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024
    
    // Evict by size limit
    while (this.cache.size >= this.options.maxSize && this.accessOrder.length > 0) {
      const oldestPath = this.accessOrder[0]
      this.cache.delete(oldestPath)
      this.accessOrder.shift()
    }
    
    // Evict by memory limit
    let currentMemory = this.calculateMemoryUsage()
    while (currentMemory + newEntrySize > maxMemoryBytes && this.accessOrder.length > 0) {
      const oldestPath = this.accessOrder[0]
      const entry = this.cache.get(oldestPath)
      if (entry) {
        currentMemory -= entry.size
        this.cache.delete(oldestPath)
      }
      this.accessOrder.shift()
    }
  }

  private updateAccessOrder(path: string): void {
    this.removeFromAccessOrder(path)
    this.accessOrder.push(path)
  }

  private removeFromAccessOrder(path: string): void {
    const index = this.accessOrder.indexOf(path)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  private estimateSize(contents: DirectoryContents): number {
    // Rough estimation of memory usage in bytes
    const jsonString = JSON.stringify(contents)
    return jsonString.length * 2 // Approximate UTF-16 encoding
  }

  private calculateMemoryUsage(): number {
    let total = 0
    for (const entry of this.cache.values()) {
      total += entry.size
    }
    return total
  }

  private updateStats(): void {
    this.stats.entryCount = this.cache.size
    this.stats.memoryUsage = this.calculateMemoryUsage()
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.totalHits / this.stats.totalRequests 
      : 0
  }

  private scheduleIntelligentPreloading(currentPath: string): void {
    // Schedule preloading in next tick to avoid blocking
    setTimeout(() => {
      const preloadPaths = this.getPreloadPaths(currentPath)
      if (preloadPaths.length > 0) {
        // This would need to be called with actual fetch function
        // this.preload(preloadPaths, fetchFn, 'parent')
      }
    }, 0)
  }

  private getParentPath(path: string): string | null {
    if (!path || path === '/' || path === '') {
      return null
    }
    
    const segments = path.split('/').filter(Boolean)
    if (segments.length <= 1) {
      return '/'
    }
    
    return '/' + segments.slice(0, -1).join('/')
  }

  private startMemoryMonitoring(): void {
    this.memoryCleanupTimer = setInterval(() => {
      const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024
      const currentMemory = this.calculateMemoryUsage()
      
      // If we're over 80% of memory limit, trigger cleanup
      if (currentMemory > maxMemoryBytes * 0.8) {
        this.performMemoryCleanup()
      }
    }, 30000) // Check every 30 seconds
  }

  private performMemoryCleanup(): void {
    const now = Date.now()
    const ttlMs = this.options.ttlMinutes * 60 * 1000
    
    // Remove expired entries
    for (const [path, entry] of this.cache.entries()) {
      if (now - entry.data.timestamp > ttlMs) {
        this.cache.delete(path)
        this.removeFromAccessOrder(path)
      }
    }
    
    // If still over memory limit, remove oldest entries
    const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024
    while (this.calculateMemoryUsage() > maxMemoryBytes && this.accessOrder.length > 0) {
      const oldestPath = this.accessOrder[0]
      this.cache.delete(oldestPath)
      this.accessOrder.shift()
    }
    
    this.updateStats()
  }

  // New intelligent caching methods

  private recordActivity(): void {
    this.lastActivity = Date.now()
    
    if (this.options.enableBackgroundPrefetch) {
      this.resetIdleTimer()
    }
  }

  private recordLoadTime(loadTime: number): void {
    this.loadTimes.push(loadTime)
    
    // Keep only last 100 load times for rolling average
    if (this.loadTimes.length > 100) {
      this.loadTimes = this.loadTimes.slice(-100)
    }
    
    // Update average load time
    this.stats.averageLoadTime = this.loadTimes.reduce((sum, time) => sum + time, 0) / this.loadTimes.length
  }

  private recordNavigationPattern(toPath: string): void {
    if (!this.options.enableNavigationPatterns) {
      return
    }

    // Find the last accessed path to create a pattern
    const lastPath = this.getLastAccessedPath()
    if (!lastPath || lastPath === toPath) {
      return
    }

    const patternKey = `${lastPath}->${toPath}`
    const existing = this.navigationPatterns.get(patternKey)
    const now = Date.now()

    if (existing) {
      existing.frequency++
      const timeDiff = now - existing.lastAccess
      existing.lastAccess = now
      // Update average time between accesses
      if (existing.averageTime === 0) {
        existing.averageTime = timeDiff
      } else {
        existing.averageTime = (existing.averageTime + timeDiff) / 2
      }
    } else {
      this.navigationPatterns.set(patternKey, {
        fromPath: lastPath,
        toPath,
        frequency: 1,
        lastAccess: now,
        averageTime: 0
      })
    }

    // Cleanup old patterns (keep only last 1000)
    if (this.navigationPatterns.size > 1000) {
      const sortedPatterns = Array.from(this.navigationPatterns.entries())
        .sort(([, a], [, b]) => b.lastAccess - a.lastAccess)
      
      this.navigationPatterns.clear()
      sortedPatterns.slice(0, 1000).forEach(([key, pattern]) => {
        this.navigationPatterns.set(key, pattern)
      })
    }
  }

  private getLastAccessedPath(): string | null {
    return this.lastAccessedPath
  }

  private predictNextPaths(currentPath: string): string[] {
    if (!this.options.enableNavigationPatterns) {
      return []
    }

    const predictions: { path: string; score: number }[] = []
    
    for (const pattern of this.navigationPatterns.values()) {
      if (pattern.fromPath === currentPath) {
        // Score based on frequency and recency
        const recencyScore = Math.max(0, 1 - (Date.now() - pattern.lastAccess) / (24 * 60 * 60 * 1000)) // Decay over 24 hours
        const frequencyScore = Math.min(1, pattern.frequency / 10) // Normalize frequency
        const score = (recencyScore * 0.3) + (frequencyScore * 0.7)
        
        predictions.push({
          path: pattern.toPath,
          score
        })
      }
    }

    return predictions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 predictions
      .filter(p => p.score > 0.1) // Only predictions with reasonable confidence
      .map(p => p.path)
  }

  private calculatePreloadPriority(path: string, reason: PreloadRequest['reason']): number {
    let priority = 0

    // Base priority by reason
    switch (reason) {
      case 'parent':
        priority = 100
        break
      case 'sibling':
        priority = 80
        break
      case 'pattern':
        priority = 60
        break
      case 'idle':
        priority = 40
        break
    }

    // Boost priority based on navigation patterns
    if (this.options.enableNavigationPatterns) {
      const currentPath = this.getLastAccessedPath()
      if (currentPath) {
        const patternKey = `${currentPath}->${path}`
        const pattern = this.navigationPatterns.get(patternKey)
        if (pattern) {
          priority += Math.min(20, pattern.frequency * 2) // Up to 20 bonus points
        }
      }
    }

    // Reduce priority if path was recently accessed (likely still in cache)
    const entry = this.cache.get(path)
    if (entry) {
      const age = Date.now() - entry.accessTime
      if (age < 60000) { // Less than 1 minute
        priority -= 30
      }
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

  private startIdleMonitoring(): void {
    this.resetIdleTimer()
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    this.idleTimer = setTimeout(() => {
      this.performBackgroundPrefetch()
    }, this.options.idleTimeThreshold)
  }

  private async performBackgroundPrefetch(): Promise<void> {
    if (!this.options.enableBackgroundPrefetch) {
      return
    }

    const currentPath = this.getLastAccessedPath()
    if (!currentPath) {
      return
    }

    // Get paths that might be accessed next based on patterns
    const predictedPaths = this.predictNextPaths(currentPath)
    const preloadPaths = this.getPreloadPaths(currentPath)
    
    // Combine and deduplicate
    const allPaths = [...new Set([...predictedPaths, ...preloadPaths])]
    const pathsToPreload = allPaths
      .filter(path => !this.cache.has(path) && !this.preloadQueue.has(path))
      .slice(0, 2) // Limit background prefetch to 2 paths

    if (pathsToPreload.length > 0) {
      // This would need to be called with actual fetch function
      // await this.preload(pathsToPreload, fetchFn, 'idle')
    }
  }

  private updateCacheEfficiency(): void {
    if (this.stats.totalRequests === 0) {
      this.stats.cacheEfficiency = 0
      return
    }

    // Calculate efficiency based on hit rate, preload effectiveness, and memory usage
    const hitRateScore = this.stats.hitRate * 100
    const preloadEffectiveness = this.stats.totalHits > 0 ? (this.stats.preloadHits / this.stats.totalHits) * 100 : 0
    const memoryEfficiency = Math.max(0, 100 - (this.stats.memoryUsage / (this.options.maxMemoryMB * 1024 * 1024)) * 100)
    
    this.stats.cacheEfficiency = (hitRateScore * 0.5) + (preloadEffectiveness * 0.3) + (memoryEfficiency * 0.2)
    
    // Update navigation pattern accuracy
    if (this.stats.preloadHits > 0 && this.stats.backgroundPrefetchCount > 0) {
      this.stats.navigationPatternAccuracy = (this.stats.preloadHits / this.stats.backgroundPrefetchCount) * 100
    }
  }

  private loadNavigationPatterns(): void {
    try {
      const stored = localStorage.getItem('directory-cache-navigation-patterns')
      if (stored) {
        const patterns = JSON.parse(stored)
        this.navigationPatterns = new Map(patterns)
      }
    } catch (error) {
      console.warn('Failed to load navigation patterns:', error)
    }
  }

  private saveNavigationPatterns(): void {
    try {
      const patterns = Array.from(this.navigationPatterns.entries())
      localStorage.setItem('directory-cache-navigation-patterns', JSON.stringify(patterns))
    } catch (error) {
      console.warn('Failed to save navigation patterns:', error)
    }
  }
}

// Singleton instance for global use
let globalCacheInstance: DirectoryCacheManager | null = null

export function getDirectoryCache(options?: Partial<DirectoryCacheOptions>): DirectoryCacheManager {
  if (!globalCacheInstance) {
    globalCacheInstance = new DirectoryCacheManager(options)
  }
  return globalCacheInstance
}

export function resetDirectoryCache(): void {
  if (globalCacheInstance) {
    globalCacheInstance.destroy()
    globalCacheInstance = null
  }
}