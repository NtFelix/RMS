/**
 * Template caching service for optimizing template loading performance
 * Provides in-memory caching with TTL and LRU eviction strategies
 */

import { Template, TemplateItem } from '@/types/template'

interface CacheEntry<T> {
  data: T
  timestamp: number
  accessCount: number
  lastAccessed: number
}

interface CacheOptions {
  maxSize: number
  ttlMs: number
  enableLRU: boolean
}

/**
 * Generic cache implementation with TTL and LRU support
 */
class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private options: CacheOptions

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxSize: options.maxSize || 100,
      ttlMs: options.ttlMs || 5 * 60 * 1000, // 5 minutes default
      enableLRU: options.enableLRU !== false
    }
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.options.ttlMs) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics for LRU
    if (this.options.enableLRU) {
      entry.accessCount++
      entry.lastAccessed = Date.now()
    }

    return entry.data
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T): void {
    const now = Date.now()
    
    // If cache is at max size, evict least recently used item
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    })
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{ key: string; accessCount: number; age: number }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      age: now - entry.timestamp
    }))

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hitRate: this.calculateHitRate(),
      entries
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    if (!this.options.enableLRU || this.cache.size === 0) {
      return
    }

    let lruKey: string | null = null
    let lruTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed
        lruKey = key
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey)
    }
  }

  /**
   * Calculate cache hit rate (simplified implementation)
   */
  private calculateHitRate(): number {
    if (this.cache.size === 0) return 0
    
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0)
    
    return totalAccesses > 0 ? (totalAccesses / (totalAccesses + this.cache.size)) : 0
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.options.ttlMs) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }
}

/**
 * Template-specific cache service
 */
export class TemplateCacheService {
  private templateCache: Cache<Template>
  private templateListCache: Cache<Template[]>
  private templateItemCache: Cache<TemplateItem[]>
  private categoryCache: Cache<string[]>
  private templateCountCache: Cache<number>

  constructor() {
    // Template cache with longer TTL for individual templates
    this.templateCache = new Cache<Template>({
      maxSize: 50,
      ttlMs: 10 * 60 * 1000, // 10 minutes
      enableLRU: true
    })

    // Template list cache with shorter TTL as lists change more frequently
    this.templateListCache = new Cache<Template[]>({
      maxSize: 20,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      enableLRU: true
    })

    // Template item cache for UI display
    this.templateItemCache = new Cache<TemplateItem[]>({
      maxSize: 20,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      enableLRU: true
    })

    // Category cache with longer TTL as categories change less frequently
    this.categoryCache = new Cache<string[]>({
      maxSize: 10,
      ttlMs: 15 * 60 * 1000, // 15 minutes
      enableLRU: false
    })

    // Template count cache
    this.templateCountCache = new Cache<number>({
      maxSize: 30,
      ttlMs: 5 * 60 * 1000, // 5 minutes
      enableLRU: true
    })

    // Set up periodic cleanup
    this.startPeriodicCleanup()
  }

  /**
   * Cache keys generators
   */
  private getTemplateKey(templateId: string): string {
    return `template:${templateId}`
  }

  private getUserTemplatesKey(userId: string): string {
    return `user_templates:${userId}`
  }

  private getCategoryTemplatesKey(userId: string, category: string): string {
    return `category_templates:${userId}:${category}`
  }

  private getUserCategoriesKey(userId: string): string {
    return `user_categories:${userId}`
  }

  private getTemplateCountKey(userId: string, category?: string): string {
    return category 
      ? `template_count:${userId}:${category}`
      : `template_count:${userId}`
  }

  private getTemplateItemsKey(userId: string, category?: string): string {
    return category
      ? `template_items:${userId}:${category}`
      : `template_items:${userId}`
  }

  /**
   * Template caching methods
   */
  getTemplate(templateId: string): Template | null {
    return this.templateCache.get(this.getTemplateKey(templateId))
  }

  setTemplate(template: Template): void {
    this.templateCache.set(this.getTemplateKey(template.id), template)
  }

  deleteTemplate(templateId: string): void {
    this.templateCache.delete(this.getTemplateKey(templateId))
    // Also invalidate related caches
    this.invalidateUserCaches(templateId)
  }

  /**
   * Template list caching methods
   */
  getUserTemplates(userId: string): Template[] | null {
    return this.templateListCache.get(this.getUserTemplatesKey(userId))
  }

  setUserTemplates(userId: string, templates: Template[]): void {
    this.templateListCache.set(this.getUserTemplatesKey(userId), templates)
    // Also cache individual templates
    templates.forEach(template => this.setTemplate(template))
  }

  getCategoryTemplates(userId: string, category: string): Template[] | null {
    return this.templateListCache.get(this.getCategoryTemplatesKey(userId, category))
  }

  setCategoryTemplates(userId: string, category: string, templates: Template[]): void {
    this.templateListCache.set(this.getCategoryTemplatesKey(userId, category), templates)
    // Also cache individual templates
    templates.forEach(template => this.setTemplate(template))
  }

  /**
   * Template item caching methods
   */
  getTemplateItems(userId: string, category?: string): TemplateItem[] | null {
    return this.templateItemCache.get(this.getTemplateItemsKey(userId, category))
  }

  setTemplateItems(userId: string, templateItems: TemplateItem[], category?: string): void {
    this.templateItemCache.set(this.getTemplateItemsKey(userId, category), templateItems)
  }

  /**
   * Category caching methods
   */
  getUserCategories(userId: string): string[] | null {
    return this.categoryCache.get(this.getUserCategoriesKey(userId))
  }

  setUserCategories(userId: string, categories: string[]): void {
    this.categoryCache.set(this.getUserCategoriesKey(userId), categories)
  }

  /**
   * Template count caching methods
   */
  getTemplateCount(userId: string, category?: string): number | null {
    return this.templateCountCache.get(this.getTemplateCountKey(userId, category))
  }

  setTemplateCount(userId: string, count: number, category?: string): void {
    this.templateCountCache.set(this.getTemplateCountKey(userId, category), count)
  }

  /**
   * Cache invalidation methods
   */
  invalidateUserCaches(userId: string): void {
    // Clear all caches related to a user
    this.templateListCache.delete(this.getUserTemplatesKey(userId))
    this.categoryCache.delete(this.getUserCategoriesKey(userId))
    
    // Clear category-specific caches (we don't know which categories to clear, so clear all)
    this.templateListCache.clear()
    this.templateItemCache.clear()
    this.templateCountCache.clear()
  }

  invalidateTemplateCache(templateId: string): void {
    this.deleteTemplate(templateId)
  }

  invalidateCategoryCache(userId: string, category: string): void {
    this.templateListCache.delete(this.getCategoryTemplatesKey(userId, category))
    this.templateItemCache.delete(this.getTemplateItemsKey(userId, category))
    this.templateCountCache.delete(this.getTemplateCountKey(userId, category))
  }

  /**
   * Cache management methods
   */
  clearAllCaches(): void {
    this.templateCache.clear()
    this.templateListCache.clear()
    this.templateItemCache.clear()
    this.categoryCache.clear()
    this.templateCountCache.clear()
  }

  getCacheStats(): {
    templates: ReturnType<Cache<Template>['getStats']>
    templateLists: ReturnType<Cache<Template[]>['getStats']>
    templateItems: ReturnType<Cache<TemplateItem[]>['getStats']>
    categories: ReturnType<Cache<string[]>['getStats']>
    templateCounts: ReturnType<Cache<number>['getStats']>
  } {
    return {
      templates: this.templateCache.getStats(),
      templateLists: this.templateListCache.getStats(),
      templateItems: this.templateItemCache.getStats(),
      categories: this.categoryCache.getStats(),
      templateCounts: this.templateCountCache.getStats()
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.templateCache.cleanExpired()
      this.templateListCache.cleanExpired()
      this.templateItemCache.cleanExpired()
      this.categoryCache.cleanExpired()
      this.templateCountCache.cleanExpired()
    }, 5 * 60 * 1000)
  }
}

// Export singleton instance
export const templateCacheService = new TemplateCacheService()