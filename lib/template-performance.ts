/**
 * Performance optimization utilities for the template system
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

// Simple debounce implementation to avoid lodash dependency
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
import { Template } from '@/types/template';

// Debounce delay constants
export const DEBOUNCE_DELAYS = {
  search: 300,
  filter: 200,
  save: 500,
  validation: 400,
} as const;

// Performance monitoring
export class TemplatePerformanceMonitor {
  private static instance: TemplatePerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): TemplatePerformanceMonitor {
    if (!TemplatePerformanceMonitor.instance) {
      TemplatePerformanceMonitor.instance = new TemplatePerformanceMonitor();
    }
    return TemplatePerformanceMonitor.instance;
  }

  startTimer(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operation)) {
        this.metrics.set(operation, []);
      }
      
      const operationMetrics = this.metrics.get(operation)!;
      operationMetrics.push(duration);
      
      // Keep only last 100 measurements
      if (operationMetrics.length > 100) {
        operationMetrics.shift();
      }
      
      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.warn(`Slow template operation: ${operation} took ${duration.toFixed(2)}ms`);
      }
    };
  }

  getAverageTime(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return 0;
    
    return metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
  }

  getMetrics(): Record<string, { average: number; count: number; max: number; min: number }> {
    const result: Record<string, { average: number; count: number; max: number; min: number }> = {};
    
    this.metrics.forEach((times, operation) => {
      if (times.length > 0) {
        result[operation] = {
          average: times.reduce((sum, time) => sum + time, 0) / times.length,
          count: times.length,
          max: Math.max(...times),
          min: Math.min(...times),
        };
      }
    });
    
    return result;
  }
}

// Optimized template search hook
export function useOptimizedTemplateSearch(templates: Template[]) {
  const searchCache = useRef<Map<string, Template[]>>(new Map());
  
  const debouncedSearch = useCallback(
    debounce((query: string, callback: (results: Template[]) => void) => {
      const monitor = TemplatePerformanceMonitor.getInstance();
      const endTimer = monitor.startTimer('template-search');
      
      try {
        // Check cache first
        if (searchCache.current.has(query)) {
          callback(searchCache.current.get(query)!);
          return;
        }
        
        const lowercaseQuery = query.toLowerCase();
        const results = templates.filter(template => 
          template.titel.toLowerCase().includes(lowercaseQuery) ||
          template.kategorie.toLowerCase().includes(lowercaseQuery) ||
          (template.inhalt && JSON.stringify(template.inhalt).toLowerCase().includes(lowercaseQuery))
        );
        
        // Cache results
        searchCache.current.set(query, results);
        
        // Limit cache size
        if (searchCache.current.size > 50) {
          const firstKey = searchCache.current.keys().next().value;
          if (firstKey !== undefined) {
            searchCache.current.delete(firstKey);
          }
        }
        
        callback(results);
      } finally {
        endTimer();
      }
    }, DEBOUNCE_DELAYS.search),
    [templates]
  );

  // Clear cache when templates change
  useEffect(() => {
    searchCache.current.clear();
  }, [templates]);

  return debouncedSearch;
}

// Optimized template filtering
export function useOptimizedTemplateFilter(templates: Template[]) {
  const filterCache = useRef<Map<string, Template[]>>(new Map());
  
  const filterByCategory = useCallback((category: string | null): Template[] => {
    const monitor = TemplatePerformanceMonitor.getInstance();
    const endTimer = monitor.startTimer('template-filter');
    
    try {
      if (!category || category === 'all') {
        return templates;
      }
      
      // Check cache
      const cacheKey = `category:${category}`;
      if (filterCache.current.has(cacheKey)) {
        return filterCache.current.get(cacheKey)!;
      }
      
      const results = templates.filter(template => template.kategorie === category);
      
      // Cache results
      filterCache.current.set(cacheKey, results);
      
      return results;
    } finally {
      endTimer();
    }
  }, [templates]);

  // Clear cache when templates change
  useEffect(() => {
    filterCache.current.clear();
  }, [templates]);

  return filterByCategory;
}

// Memoized template grouping
export function useOptimizedTemplateGrouping(templates: Template[]) {
  return useMemo(() => {
    const monitor = TemplatePerformanceMonitor.getInstance();
    const endTimer = monitor.startTimer('template-grouping');
    
    try {
      const grouped = templates.reduce((acc, template) => {
        const category = template.kategorie;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(template);
        return acc;
      }, {} as Record<string, Template[]>);
      
      // Sort templates within each category by title
      Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.titel.localeCompare(b.titel));
      });
      
      return grouped;
    } finally {
      endTimer();
    }
  }, [templates]);
}

// Debounced validation
export function useDebouncedValidation<T>(
  validationFn: (value: T) => boolean | string[],
  delay: number = DEBOUNCE_DELAYS.validation
) {
  const validationCache = useRef<Map<string, boolean | string[]>>(new Map());
  
  return useCallback(
    debounce((value: T, callback: (result: boolean | string[]) => void) => {
      const monitor = TemplatePerformanceMonitor.getInstance();
      const endTimer = monitor.startTimer('template-validation');
      
      try {
        const cacheKey = JSON.stringify(value);
        
        // Check cache
        if (validationCache.current.has(cacheKey)) {
          callback(validationCache.current.get(cacheKey)!);
          return;
        }
        
        const result = validationFn(value);
        
        // Cache result
        validationCache.current.set(cacheKey, result);
        
        // Limit cache size
        if (validationCache.current.size > 20) {
          const firstKey = validationCache.current.keys().next().value;
          if (firstKey !== undefined) {
            validationCache.current.delete(firstKey);
          }
        }
        
        callback(result);
      } finally {
        endTimer();
      }
    }, delay),
    [validationFn, delay]
  );
}

// Virtual scrolling for large template lists
export function useVirtualScrolling(
  itemCount: number,
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, itemCount]);
  
  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  return {
    visibleRange,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

// Memory cleanup utilities
export function useTemplateCleanup() {
  const cleanupFunctions = useRef<(() => void)[]>([]);
  
  const addCleanup = useCallback((fn: () => void) => {
    cleanupFunctions.current.push(fn);
  }, []);
  
  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(fn => fn());
      cleanupFunctions.current = [];
    };
  }, []);
  
  return addCleanup;
}

// Optimized content extraction for previews
export function extractTextPreview(content: any, maxLength: number = 120): string {
  if (!content || !content.content) return '';
  
  const monitor = TemplatePerformanceMonitor.getInstance();
  const endTimer = monitor.startTimer('text-extraction');
  
  try {
    const extractText = (node: any): string => {
      if (node.type === 'text') {
        return node.text || '';
      }
      if (node.content && Array.isArray(node.content)) {
        return node.content.map(extractText).join('');
      }
      return '';
    };
    
    const text = content.content.map(extractText).join(' ').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  } finally {
    endTimer();
  }
}

// Performance monitoring hook
export function useTemplatePerformanceMonitoring() {
  const monitor = TemplatePerformanceMonitor.getInstance();
  
  useEffect(() => {
    // Log performance metrics every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const metrics = monitor.getMetrics();
        if (Object.keys(metrics).length > 0) {
          console.table(metrics);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [monitor]);
  
  return {
    startTimer: monitor.startTimer.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
  };
}