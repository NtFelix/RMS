import { useCallback, useRef } from 'react';

interface SearchAnalytics {
  totalSearches: number;
  averageResponseTime: number;
  popularQueries: Record<string, number>;
  errorRate: number;
  cacheHitRate: number;
}

interface SearchEvent {
  query: string;
  responseTime: number;
  resultCount: number;
  wasError: boolean;
  wasCacheHit: boolean;
  timestamp: number;
}

const ANALYTICS_STORAGE_KEY = 'rms-search-analytics';
const MAX_POPULAR_QUERIES = 10;

export function useSearchAnalytics() {
  const analyticsRef = useRef<SearchAnalytics>({
    totalSearches: 0,
    averageResponseTime: 0,
    popularQueries: {},
    errorRate: 0,
    cacheHitRate: 0
  });

  // Load analytics from localStorage on first use
  const loadAnalytics = useCallback(() => {
    try {
      const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        analyticsRef.current = { ...analyticsRef.current, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load search analytics:', error);
    }
  }, []);

  // Save analytics to localStorage
  const saveAnalytics = useCallback(() => {
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analyticsRef.current));
    } catch (error) {
      console.warn('Failed to save search analytics:', error);
    }
  }, []);

  // Track a search event
  const trackSearch = useCallback((event: Omit<SearchEvent, 'timestamp'>) => {
    const analytics = analyticsRef.current;
    
    // Update total searches
    analytics.totalSearches++;
    
    // Update average response time
    const currentAvg = analytics.averageResponseTime;
    analytics.averageResponseTime = 
      (currentAvg * (analytics.totalSearches - 1) + event.responseTime) / analytics.totalSearches;
    
    // Update popular queries
    if (event.query.trim() && event.resultCount > 0) {
      analytics.popularQueries[event.query] = (analytics.popularQueries[event.query] || 0) + 1;
      
      // Keep only top queries
      const sortedQueries = Object.entries(analytics.popularQueries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_POPULAR_QUERIES);
      
      analytics.popularQueries = Object.fromEntries(sortedQueries);
    }
    
    // Update error rate
    const errorCount = analytics.errorRate * (analytics.totalSearches - 1) + (event.wasError ? 1 : 0);
    analytics.errorRate = errorCount / analytics.totalSearches;
    
    // Update cache hit rate
    const cacheHitCount = analytics.cacheHitRate * (analytics.totalSearches - 1) + (event.wasCacheHit ? 1 : 0);
    analytics.cacheHitRate = cacheHitCount / analytics.totalSearches;
    
    // Save to localStorage
    saveAnalytics();
  }, [saveAnalytics]);

  // Get analytics summary
  const getAnalytics = useCallback(() => {
    loadAnalytics();
    return {
      ...analyticsRef.current,
      popularQueries: Object.entries(analyticsRef.current.popularQueries)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([query, count]) => ({ query, count }))
    };
  }, [loadAnalytics]);

  // Reset analytics
  const resetAnalytics = useCallback(() => {
    analyticsRef.current = {
      totalSearches: 0,
      averageResponseTime: 0,
      popularQueries: {},
      errorRate: 0,
      cacheHitRate: 0
    };
    saveAnalytics();
  }, [saveAnalytics]);

  return {
    trackSearch,
    getAnalytics,
    resetAnalytics
  };
}