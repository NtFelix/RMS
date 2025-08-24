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
}

export interface DirectoryCacheOptions {
  maxSize: number // Maximum number of entries
  maxMemoryMB: number // Maximum memory usage in MB
  ttlMinutes: number // Time to live in minutes
  enablePreloading: boolean
  enableMemoryMonitoring: boolean
}

const DEFAULT_OPTIONS: DirectoryCacheOptions = {
  maxSize: 100,
  maxMemoryMB: 50,
  ttlMinutes: 5,
  enablePreloading: true,
  enableMemoryMonitoring: true
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
    entryCount: 0
  }
  private memoryCleanupTimer?: NodeJS.Timeout
  private preloadQueue = new Set<string>()

  constructor(options: Partial<DirectoryCacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    
    if (this.options.enableMemoryMonitoring) {
      this.startMemoryMonitoring()
    }
  }

  /**
   * Get directory contents from cache
   */
  get(path: string): DirectoryContents | null {
    this.stats.totalRequests++
    
    const entry = this.cache.get(path)
    if (!entry) {
      this.stats.totalMisses++
      this.updateHitRate()
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
      return null
    }

    // Update access time and order for LRU
    entry.accessTime = now
    this.updateAccessOrder(path)
    
    this.stats.totalHits++
    this.updateHitRate()
    
    return entry.data
  }

  /**
   * Set directory contents in cache
   */
  set(path: string, contents: DirectoryContents): void {
    const now = Date.now()
    const size = this.estimateSize(contents)
    
    const entry: CacheEntry = {
      data: { ...contents, timestamp: now },
      accessTime: now,
      size
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
    
    // Trigger preloading if enabled
    if (this.options.enablePreloading) {
      this.schedulePreloading(path)
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
   * Preload directory contents for given paths
   */
  async preload(paths: string[], fetchFn: (path: string) => Promise<DirectoryContents>): Promise<void> {
    const preloadPromises = paths
      .filter(path => !this.cache.has(path) && !this.preloadQueue.has(path))
      .map(async (path) => {
        this.preloadQueue.add(path)
        try {
          const contents = await fetchFn(path)
          this.set(path, contents)
        } catch (error) {
          console.warn(`Failed to preload directory: ${path}`, error)
        } finally {
          this.preloadQueue.delete(path)
        }
      })

    await Promise.allSettled(preloadPromises)
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats }
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
    
    // Add sibling directories (would need to be implemented based on your folder structure)
    // This is a placeholder - you'd need to implement based on your specific needs
    
    return paths
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.memoryCleanupTimer) {
      clearInterval(this.memoryCleanupTimer)
    }
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

  private schedulePreloading(currentPath: string): void {
    // Schedule preloading in next tick to avoid blocking
    setTimeout(() => {
      const preloadPaths = this.getPreloadPaths(currentPath)
      if (preloadPaths.length > 0) {
        // This would need to be called with actual fetch function
        // this.preload(preloadPaths, fetchFn)
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