/**
 * Performance optimization hooks for Tiptap editor
 * Provides memoization and debouncing for expensive editor operations
 */

import { useCallback, useMemo, useRef } from 'react'
import { useDebounce } from './use-debounce'

/**
 * Hook for optimizing content change detection
 */
export function useOptimizedContentChange<T>(
  content: T,
  onContentChange: (content: T) => void,
  delay: number = 150
) {
  const debouncedContent = useDebounce(content, delay)
  const lastContentRef = useRef<string>('')

  const optimizedOnChange = useCallback((newContent: T) => {
    const contentString = JSON.stringify(newContent)
    
    // Only trigger change if content actually changed
    if (contentString !== lastContentRef.current) {
      lastContentRef.current = contentString
      onContentChange(newContent)
    }
  }, [onContentChange])

  // Effect to call optimized change handler with debounced content
  const handleDebouncedChange = useCallback(() => {
    optimizedOnChange(debouncedContent)
  }, [debouncedContent, optimizedOnChange])

  return {
    debouncedContent,
    handleDebouncedChange,
    optimizedOnChange
  }
}

/**
 * Hook for memoizing editor extensions
 */
export function useMemoizedEditorExtensions(
  extensionFactories: Array<() => any>,
  dependencies: any[]
) {
  return useMemo(() => {
    return extensionFactories.map(factory => factory())
  }, dependencies)
}

/**
 * Hook for optimizing variable extraction with caching
 */
export function useOptimizedVariableExtraction(
  content: any,
  extractFunction: (content: any) => string[],
  delay: number = 300
) {
  const debouncedContent = useDebounce(content, delay)
  const cacheRef = useRef<Map<string, string[]>>(new Map())

  const extractedVariables = useMemo(() => {
    const contentKey = JSON.stringify(debouncedContent)
    
    // Check cache first
    if (cacheRef.current.has(contentKey)) {
      return cacheRef.current.get(contentKey)!
    }

    // Extract variables and cache result
    const variables = extractFunction(debouncedContent)
    
    // Limit cache size to prevent memory leaks
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value
      if (firstKey !== undefined) {
        cacheRef.current.delete(firstKey)
      }
    }
    
    cacheRef.current.set(contentKey, variables)
    return variables
  }, [debouncedContent, extractFunction])

  return extractedVariables
}

/**
 * Hook for optimizing mention/slash command filtering
 */
export function useOptimizedFiltering<T>(
  items: T[],
  query: string,
  filterFunction: (items: T[], query: string) => T[],
  delay: number = 100,
  maxResults: number = 10
) {
  const debouncedQuery = useDebounce(query, delay)
  const cacheRef = useRef<Map<string, T[]>>(new Map())

  const filteredItems = useMemo(() => {
    // Early return for empty query
    if (!debouncedQuery.trim()) {
      return items.slice(0, maxResults)
    }

    const cacheKey = `${debouncedQuery}-${items.length}`
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!
    }

    // Filter items and cache result
    const filtered = filterFunction(items, debouncedQuery).slice(0, maxResults)
    
    // Limit cache size
    if (cacheRef.current.size > 20) {
      const firstKey = cacheRef.current.keys().next().value
      if (firstKey !== undefined) {
        cacheRef.current.delete(firstKey)
      }
    }
    
    cacheRef.current.set(cacheKey, filtered)
    return filtered
  }, [items, debouncedQuery, filterFunction, maxResults])

  return filteredItems
}

/**
 * Hook for optimizing keyboard event handlers
 */
export function useOptimizedKeyboardHandler(
  handlers: Record<string, () => boolean | void>,
  dependencies: any[]
) {
  return useCallback((event: KeyboardEvent) => {
    const handler = handlers[event.key]
    if (handler) {
      const result = handler()
      return result === true
    }
    return false
  }, dependencies)
}

/**
 * Hook for throttling expensive operations
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      return callback(...args)
    } else {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now()
        callback(...args)
      }, delay - (now - lastCallRef.current))
    }
  }, [callback, delay]) as T
}

/**
 * Hook for memoizing complex calculations
 */
export function useMemoizedCalculation<T, R>(
  input: T,
  calculation: (input: T) => R,
  dependencies: any[] = []
): R {
  return useMemo(() => {
    return calculation(input)
  }, [input, ...dependencies])
}

/**
 * Hook for optimizing component re-renders
 */
export function useRenderOptimization(dependencies: any[]) {
  const renderCountRef = useRef(0)
  const lastDepsRef = useRef<any[]>([])

  // Check if dependencies actually changed
  const depsChanged = dependencies.some((dep, index) => {
    return dep !== lastDepsRef.current[index]
  })

  if (depsChanged) {
    renderCountRef.current++
    lastDepsRef.current = dependencies
  }

  return {
    renderCount: renderCountRef.current,
    shouldRender: depsChanged
  }
}

/**
 * Performance monitoring hook for development
 */
export function usePerformanceMonitor(componentName: string, enabled: boolean = false) {
  const renderStartRef = useRef<number>(0)
  const renderCountRef = useRef<number>(0)
  const metricsRef = useRef<{
    initTime?: number
    parseTime?: number
    renderTime?: number
    memoryUsage?: number
    lastRenderTime?: number
    averageRenderTime?: number
    renderTimes: number[]
  }>({
    renderTimes: []
  })

  if (enabled && process.env.NODE_ENV === 'development') {
    renderStartRef.current = performance.now()
    renderCountRef.current++

    // Log performance after render
    setTimeout(() => {
      const renderTime = performance.now() - renderStartRef.current
      metricsRef.current.lastRenderTime = renderTime
      metricsRef.current.renderTimes.push(renderTime)
      
      // Keep only last 10 render times for average calculation
      if (metricsRef.current.renderTimes.length > 10) {
        metricsRef.current.renderTimes.shift()
      }
      
      // Calculate average render time
      metricsRef.current.averageRenderTime = 
        metricsRef.current.renderTimes.reduce((sum, time) => sum + time, 0) / 
        metricsRef.current.renderTimes.length
      
      // Get memory usage if available
      if ('memory' in performance) {
        metricsRef.current.memoryUsage = (performance as any).memory.usedJSHeapSize
      }
      
      if (renderTime > 16) { // More than one frame (60fps)
        console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`)
      }
    }, 0)
  }

  const recordInitTime = useCallback((time: number) => {
    metricsRef.current.initTime = time
  }, [])

  const recordParseTime = useCallback((time: number) => {
    metricsRef.current.parseTime = time
  }, [])

  const recordRenderTime = useCallback((time: number) => {
    metricsRef.current.renderTime = time
  }, [])

  const getMetrics = useCallback(() => {
    return { ...metricsRef.current }
  }, [])

  return {
    renderCount: renderCountRef.current,
    startTime: renderStartRef.current,
    metrics: metricsRef.current,
    recordInitTime,
    recordParseTime,
    recordRenderTime,
    getMetrics
  }
}