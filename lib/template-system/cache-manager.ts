/**
 * Cache Manager for Template System
 * Provides caching for placeholder definitions, entity data, and processed templates
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Generic cache implementation with TTL support
 */
export class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Evict oldest entries to make room
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Template System Cache Manager
 * Manages all caches for the template system
 */
export class TemplateCacheManager {
  // Cache for placeholder definitions (static, long TTL)
  public placeholderCache = new Cache<any>(100, 60 * 60 * 1000); // 1 hour

  // Cache for entity data (dynamic, shorter TTL)
  public entityCache = new Cache<any>(500, 5 * 60 * 1000); // 5 minutes

  // Cache for autocomplete suggestions (short TTL for responsiveness)
  public suggestionCache = new Cache<any>(1000, 2 * 60 * 1000); // 2 minutes

  // Cache for processed templates (medium TTL)
  public templateCache = new Cache<string>(200, 10 * 60 * 1000); // 10 minutes

  // Cache for validation results (short TTL)
  public validationCache = new Cache<any>(500, 1 * 60 * 1000); // 1 minute

  /**
   * Get combined cache statistics
   */
  getAllStats(): Record<string, CacheStats> {
    return {
      placeholder: this.placeholderCache.getStats(),
      entity: this.entityCache.getStats(),
      suggestion: this.suggestionCache.getStats(),
      template: this.templateCache.getStats(),
      validation: this.validationCache.getStats()
    };
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.placeholderCache.clear();
    this.entityCache.clear();
    this.suggestionCache.clear();
    this.templateCache.clear();
    this.validationCache.clear();
  }

  /**
   * Cleanup expired entries in all caches
   */
  cleanupAll(): void {
    this.placeholderCache.cleanup();
    this.entityCache.cleanup();
    this.suggestionCache.cleanup();
    this.templateCache.cleanup();
    this.validationCache.cleanup();
  }

  /**
   * Generate cache key for entity data
   */
  generateEntityKey(type: string, id: string): string {
    return `entity:${type}:${id}`;
  }

  /**
   * Generate cache key for suggestions
   */
  generateSuggestionKey(query: string, maxResults: number): string {
    return `suggestion:${query}:${maxResults}`;
  }

  /**
   * Generate cache key for template processing
   */
  generateTemplateKey(content: string, contextHash: string): string {
    // Use a simple hash of content + context for cache key
    const hash = this.simpleHash(content + contextHash);
    return `template:${hash}`;
  }

  /**
   * Generate cache key for validation
   */
  generateValidationKey(content: string): string {
    const hash = this.simpleHash(content);
    return `validation:${hash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Export singleton instance
export const templateCacheManager = new TemplateCacheManager();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    templateCacheManager.cleanupAll();
  }, 5 * 60 * 1000);
}