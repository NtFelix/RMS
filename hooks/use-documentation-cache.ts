import { useState, useEffect, useCallback, useRef } from 'react';
import type { Article, Category } from '@/types/documentation';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

class DocumentationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100;

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    return now > entry.expiresAt;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const documentationCache = new DocumentationCache();

export function useDocumentationCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const {
    ttl,
    staleWhileRevalidate = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);

      // Check cache first
      if (!forceRefresh) {
        const cachedData = documentationCache.get<T>(key);
        
        if (cachedData) {
          setData(cachedData);
          setIsStale(false);
          return cachedData;
        }

        // Check for stale data if staleWhileRevalidate is enabled
        if (staleWhileRevalidate) {
          const staleData = documentationCache.getStale<T>(key);
          
          if (staleData) {
            setData(staleData);
            setIsStale(true);
            // Continue to fetch fresh data in background
          }
        }
      }

      setIsLoading(true);

      const freshData = await fetcherRef.current();
      
      // Cache the fresh data
      documentationCache.set(key, freshData, ttl);
      
      setData(freshData);
      setIsStale(false);
      setIsLoading(false);

      return freshData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setIsLoading(false);
      
      // If we have stale data and staleWhileRevalidate is enabled, keep showing it
      if (staleWhileRevalidate) {
        const staleData = documentationCache.getStale<T>(key);
        if (staleData) {
          setData(staleData);
          setIsStale(true);
        }
      }

      throw error;
    }
  }, [key, ttl, staleWhileRevalidate]);

  const invalidate = useCallback(() => {
    documentationCache.invalidate(key);
    setData(null);
    setIsStale(false);
  }, [key]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    refresh,
    invalidate,
    refetch: fetchData,
  };
}

// Specialized hooks for common documentation data
export function useCachedCategories() {
  return useDocumentationCache<Category[]>(
    'documentation:categories',
    async () => {
      const response = await fetch('/api/dokumentation/categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      return response.json();
    },
    { ttl: 10 * 60 * 1000 } // 10 minutes TTL for categories
  );
}

export function useCachedArticles(kategorie?: string | null) {
  const cacheKey = kategorie 
    ? `documentation:articles:category:${kategorie}`
    : 'documentation:articles:all';

  return useDocumentationCache<Article[]>(
    cacheKey,
    async () => {
      const params = new URLSearchParams();
      if (kategorie) {
        params.set('kategorie', kategorie);
      }
      
      const response = await fetch(`/api/dokumentation?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      return response.json();
    },
    { ttl: 5 * 60 * 1000 } // 5 minutes TTL for articles
  );
}

export function useCachedArticle(id: string) {
  return useDocumentationCache<Article>(
    `documentation:article:${id}`,
    async () => {
      const response = await fetch(`/api/dokumentation/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      return response.json();
    },
    { ttl: 15 * 60 * 1000 } // 15 minutes TTL for individual articles
  );
}

export function useCachedSearch(query: string) {
  const cacheKey = `documentation:search:${query.toLowerCase().trim()}`;

  return useDocumentationCache<Article[]>(
    cacheKey,
    async () => {
      if (!query.trim()) {
        return [];
      }
      
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/dokumentation/search?${params}`);
      if (!response.ok) {
        throw new Error('Failed to search articles');
      }
      return response.json();
    },
    { 
      ttl: 2 * 60 * 1000, // 2 minutes TTL for search results
      staleWhileRevalidate: false, // Don't show stale search results
    }
  );
}

// Utility functions for cache management
export const documentationCacheUtils = {
  invalidateAll: () => documentationCache.clear(),
  invalidateCategories: () => documentationCache.invalidate('documentation:categories'),
  invalidateArticles: () => documentationCache.invalidatePattern('documentation:articles:'),
  invalidateSearch: () => documentationCache.invalidatePattern('documentation:search:'),
  getCacheSize: () => documentationCache.size(),
};