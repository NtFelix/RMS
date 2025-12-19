/**
 * Client-side AI Cache Hook
 * Provides cache management utilities for AI assistant components
 */

import { useState, useEffect, useCallback } from 'react';
import type { AICacheStats } from '@/lib/ai-cache';

interface ClientAICacheEntry {
  query: string;
  response: string;
  contextHash: string;
  timestamp: number;
  expiresAt: number;
}

interface ClientAICacheOptions {
  maxEntries?: number;
  ttlMinutes?: number;
  enableLocalStorage?: boolean;
}

const DEFAULT_OPTIONS: ClientAICacheOptions = {
  maxEntries: 50,
  ttlMinutes: 30,
  enableLocalStorage: true,
};

class ClientAICache {
  private cache = new Map<string, ClientAICacheEntry>();
  private options: ClientAICacheOptions;
  private storageKey = 'ai-assistant-cache';

  constructor(options: ClientAICacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadFromStorage();
  }

  set(query: string, response: string, contextHash: string): void {
    const now = Date.now();
    const ttlMs = (this.options.ttlMinutes || 30) * 60 * 1000;
    const cacheKey = this.generateKey(query, contextHash);

    // Remove oldest entries if cache is full
    if (this.cache.size >= (this.options.maxEntries || 50)) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    const entry: ClientAICacheEntry = {
      query,
      response,
      contextHash,
      timestamp: now,
      expiresAt: now + ttlMs,
    };

    this.cache.set(cacheKey, entry);
    this.saveToStorage();
  }

  get(query: string, contextHash: string): string | null {
    const cacheKey = this.generateKey(query, contextHash);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.saveToStorage();
      return null;
    }

    return entry.response;
  }

  has(query: string, contextHash: string): boolean {
    const cacheKey = this.generateKey(query, contextHash);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.saveToStorage();
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.saveToStorage();
  }

  getStats(): {
    size: number;
    memoryUsage: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    const entries = Array.from(this.cache.values());
    const memoryUsage = entries.reduce((total, entry) => {
      return total + (entry.query.length + entry.response.length) * 2;
    }, 0);

    const timestamps = entries.map(e => e.timestamp);

    return {
      size: this.cache.size,
      memoryUsage,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }

  private generateKey(query: string, contextHash: string): string {
    return `${this.hashString(query)}-${contextHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private loadFromStorage(): void {
    if (!this.options.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired entries
        const validEntries = data.filter((entry: ClientAICacheEntry) => now <= entry.expiresAt);

        validEntries.forEach((entry: ClientAICacheEntry) => {
          const key = this.generateKey(entry.query, entry.contextHash);
          this.cache.set(key, entry);
        });
      }
    } catch (error) {
      console.warn('Failed to load AI cache from localStorage:', error);
    }
  }

  private saveToStorage(): void {
    if (!this.options.enableLocalStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const entries = Array.from(this.cache.values());
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch (error) {
      console.warn('Failed to save AI cache to localStorage:', error);
    }
  }
}

let clientCacheInstance: ClientAICache | null = null;

export function useAICacheClient(options?: ClientAICacheOptions) {
  const [cache] = useState(() => {
    if (!clientCacheInstance) {
      clientCacheInstance = new ClientAICache(options);
    }
    return clientCacheInstance;
  });

  const [stats, setStats] = useState(cache.getStats());

  const updateStats = useCallback(() => {
    setStats(cache.getStats());
  }, [cache]);

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  const cacheResponse = useCallback((query: string, response: string, contextHash: string) => {
    cache.set(query, response, contextHash);
    updateStats();
  }, [cache, updateStats]);

  const getCachedResponse = useCallback((query: string, contextHash: string) => {
    return cache.get(query, contextHash);
  }, [cache]);

  const hasCachedResponse = useCallback((query: string, contextHash: string) => {
    return cache.has(query, contextHash);
  }, [cache]);

  const clearCache = useCallback(() => {
    cache.clear();
    updateStats();
  }, [cache, updateStats]);

  return {
    cacheResponse,
    getCachedResponse,
    hasCachedResponse,
    clearCache,
    stats,
    updateStats,
  };
}

// Hook for cache invalidation strategies
export function useAICacheInvalidation() {
  const invalidateOnDocumentationUpdate = useCallback(() => {
    // Clear client cache when documentation is updated
    if (clientCacheInstance) {
      clientCacheInstance.clear();
    }
  }, []);

  const invalidateOnError = useCallback(() => {
    // Clear cache on persistent errors
    if (clientCacheInstance) {
      clientCacheInstance.clear();
    }
  }, []);

  const schedulePeriodicCleanup = useCallback(() => {
    // Schedule cleanup every 5 minutes
    const interval = setInterval(() => {
      if (clientCacheInstance) {
        // Trigger cleanup by accessing stats (which removes expired entries)
        clientCacheInstance.getStats();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    invalidateOnDocumentationUpdate,
    invalidateOnError,
    schedulePeriodicCleanup,
  };
}

// Hook for cache warming strategies
export function useAICacheWarming() {
  const warmCommonQueries = useCallback(async (
    commonQueries: string[],
    contextHash: string,
    fetchFn: (query: string) => Promise<string>
  ) => {
    if (!clientCacheInstance) {
      return;
    }

    const warmingPromises = commonQueries
      .filter(query => !clientCacheInstance!.has(query, contextHash))
      .slice(0, 3) // Limit to 3 queries to avoid overwhelming
      .map(async (query) => {
        try {
          const response = await fetchFn(query);
          clientCacheInstance!.set(query, response, contextHash);
        } catch (error) {
          console.warn(`Failed to warm cache for query: ${query}`, error);
        }
      });

    await Promise.allSettled(warmingPromises);
  }, []);

  const preloadFrequentQueries = useCallback(async (
    contextHash: string,
    fetchFn: (query: string) => Promise<string>
  ) => {
    // Common Mietevo-related queries that users frequently ask
    const frequentQueries = [
      'Wie erstelle ich eine Betriebskostenabrechnung?',
      'Wie füge ich einen neuen Mieter hinzu?',
      'Wie lade ich Dokumente hoch?',
      'Wie bearbeite ich Wohnungsdaten?',
      'Wie funktioniert die Wasserzähler-Verwaltung?',
    ];

    await warmCommonQueries(frequentQueries, contextHash, fetchFn);
  }, [warmCommonQueries]);

  return {
    warmCommonQueries,
    preloadFrequentQueries,
  };
}