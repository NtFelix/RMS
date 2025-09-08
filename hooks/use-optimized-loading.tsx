'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface LoadingState {
  isLoading: boolean
  isNavigating: boolean
  loadingType: 'initial' | 'navigation' | 'refresh' | 'operation'
  startTime: number | null
  estimatedDuration: number
  showSkeleton: boolean
  showOptimistic: boolean
}

interface OptimizedLoadingOptions {
  minLoadingTime?: number // Minimum time to show loading (prevents flashing)
  maxSkeletonTime?: number // Maximum time to show skeleton before switching to spinner
  enableOptimisticUI?: boolean // Enable optimistic UI updates
  skeletonDelay?: number // Delay before showing skeleton
  contentType?: 'files' | 'folders' | 'mixed' // Content type for smart skeletons
}

const DEFAULT_OPTIONS: Required<OptimizedLoadingOptions> = {
  minLoadingTime: 200,
  maxSkeletonTime: 3000,
  enableOptimisticUI: true,
  skeletonDelay: 100,
  contentType: 'mixed'
}

/**
 * Optimized loading state manager for cloud storage navigation
 * 
 * Features:
 * - Prevents loading flashes for fast operations
 * - Smart skeleton loading with content-aware skeletons
 * - Optimistic UI updates for immediate feedback
 * - Progressive loading states (skeleton -> spinner -> content)
 * - Performance tracking and adaptive behavior
 */
export function useOptimizedLoading(options: OptimizedLoadingOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isNavigating: false,
    loadingType: 'initial',
    startTime: null,
    estimatedDuration: 1000,
    showSkeleton: false,
    showOptimistic: false
  })
  
  const timeoutRefs = useRef<{
    minLoading?: NodeJS.Timeout
    skeleton?: NodeJS.Timeout
    maxSkeleton?: NodeJS.Timeout
  }>({})
  
  const performanceRef = useRef<{
    recentLoadTimes: number[]
    averageLoadTime: number
    cacheHitRate: number
  }>({
    recentLoadTimes: [],
    averageLoadTime: 1000,
    cacheHitRate: 0
  })

  // Calculate estimated duration based on recent performance
  const getEstimatedDuration = useCallback((type: LoadingState['loadingType'], fromCache: boolean = false) => {
    const perf = performanceRef.current
    
    if (fromCache) {
      return 100 // Very fast for cached content
    }
    
    if (perf.recentLoadTimes.length === 0) {
      return type === 'navigation' ? 500 : 1000
    }
    
    // Use recent average with some padding
    const padding = type === 'navigation' ? 1.2 : 1.5
    return Math.min(perf.averageLoadTime * padding, 5000)
  }, [])

  // Update performance metrics
  const updatePerformanceMetrics = useCallback((loadTime: number, fromCache: boolean = false) => {
    const perf = performanceRef.current
    
    // Update load times (keep last 10)
    perf.recentLoadTimes.push(loadTime)
    if (perf.recentLoadTimes.length > 10) {
      perf.recentLoadTimes.shift()
    }
    
    // Calculate new average
    perf.averageLoadTime = perf.recentLoadTimes.reduce((sum, time) => sum + time, 0) / perf.recentLoadTimes.length
    
    // Update cache hit rate (simplified)
    if (fromCache) {
      perf.cacheHitRate = Math.min(perf.cacheHitRate + 0.1, 1)
    } else {
      perf.cacheHitRate = Math.max(perf.cacheHitRate - 0.05, 0)
    }
  }, [])

  // Start loading with optimized behavior
  const startLoading = useCallback((
    type: LoadingState['loadingType'] = 'navigation',
    fromCache: boolean = false,
    optimisticTarget?: string
  ) => {
    const startTime = performance.now()
    const estimatedDuration = getEstimatedDuration(type, fromCache)
    
    // Clear any existing timeouts
    Object.values(timeoutRefs.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    
    // Set initial loading state
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      isNavigating: type === 'navigation',
      loadingType: type,
      startTime,
      estimatedDuration,
      showSkeleton: false,
      showOptimistic: opts.enableOptimisticUI && !!optimisticTarget
    }))
    
    // Show skeleton after delay (unless it's a very fast cached operation)
    if (!fromCache || estimatedDuration > 50) {
      timeoutRefs.current.skeleton = setTimeout(() => {
        setLoadingState(prev => prev.isLoading ? { ...prev, showSkeleton: true } : prev)
      }, opts.skeletonDelay)
      
      // Switch from skeleton to spinner after max skeleton time
      timeoutRefs.current.maxSkeleton = setTimeout(() => {
        setLoadingState(prev => prev.isLoading ? { ...prev, showSkeleton: false } : prev)
      }, opts.maxSkeletonTime)
    }
    
    return startTime
  }, [getEstimatedDuration, opts.enableOptimisticUI, opts.skeletonDelay, opts.maxSkeletonTime])

  // Stop loading with minimum time enforcement
  const stopLoading = useCallback((startTime?: number, fromCache: boolean = false) => {
    const endTime = performance.now()
    const actualStartTime = startTime || loadingState.startTime || endTime
    const loadTime = endTime - actualStartTime
    
    // Update performance metrics
    updatePerformanceMetrics(loadTime, fromCache)
    
    // Clear timeouts
    Object.values(timeoutRefs.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout)
    })
    timeoutRefs.current = {}
    
    // Enforce minimum loading time to prevent flashing
    const remainingMinTime = Math.max(0, opts.minLoadingTime - loadTime)
    
    if (remainingMinTime > 0) {
      timeoutRefs.current.minLoading = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
          isNavigating: false,
          showSkeleton: false,
          showOptimistic: false,
          startTime: null
        }))
      }, remainingMinTime)
    } else {
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
        isNavigating: false,
        showSkeleton: false,
        showOptimistic: false,
        startTime: null
      }))
    }
  }, [loadingState.startTime, opts.minLoadingTime, updatePerformanceMetrics])

  // Set optimistic state for immediate feedback
  const setOptimisticState = useCallback((target: string, action: string = 'navigating') => {
    if (!opts.enableOptimisticUI) return
    
    setLoadingState(prev => ({
      ...prev,
      showOptimistic: true
    }))
  }, [opts.enableOptimisticUI])

  // Clear optimistic state
  const clearOptimisticState = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      showOptimistic: false
    }))
  }, [])

  // Get loading progress (estimated)
  const getLoadingProgress = useCallback(() => {
    if (!loadingState.isLoading || !loadingState.startTime) return 0
    
    const elapsed = performance.now() - loadingState.startTime
    const progress = Math.min((elapsed / loadingState.estimatedDuration) * 100, 95)
    
    return Math.round(progress)
  }, [loadingState.isLoading, loadingState.startTime, loadingState.estimatedDuration])

  // Determine what loading UI to show
  const getLoadingUI = useCallback(() => {
    if (!loadingState.isLoading) return 'none'
    
    if (loadingState.showOptimistic) return 'optimistic'
    if (loadingState.showSkeleton) return 'skeleton'
    
    // For very short operations, show nothing to prevent flashing
    const elapsed = loadingState.startTime ? performance.now() - loadingState.startTime : 0
    if (elapsed < opts.skeletonDelay) return 'none'
    
    return 'spinner'
  }, [loadingState, opts.skeletonDelay])

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return {
      averageLoadTime: performanceRef.current.averageLoadTime,
      cacheHitRate: performanceRef.current.cacheHitRate,
      recentLoadTimes: [...performanceRef.current.recentLoadTimes]
    }
  }, [])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutRefs.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
  }, [])

  return {
    // State
    ...loadingState,
    
    // Actions
    startLoading,
    stopLoading,
    setOptimisticState,
    clearOptimisticState,
    
    // Computed values
    loadingProgress: getLoadingProgress(),
    loadingUI: getLoadingUI(),
    shouldShowSkeleton: loadingState.showSkeleton,
    shouldShowOptimistic: loadingState.showOptimistic,
    shouldShowSpinner: getLoadingUI() === 'spinner',
    
    // Performance
    performanceMetrics: getPerformanceMetrics(),
    
    // Utilities
    isVeryFast: performanceRef.current.averageLoadTime < 200,
    isCacheEffective: performanceRef.current.cacheHitRate > 0.7
  }
}

/**
 * Hook for managing loading states during navigation
 */
export function useNavigationLoading(options: OptimizedLoadingOptions = {}) {
  const loading = useOptimizedLoading({
    ...options,
    minLoadingTime: 150, // Shorter for navigation
    maxSkeletonTime: 2000,
    skeletonDelay: 50
  })
  
  const startNavigation = useCallback((targetPath: string, fromCache: boolean = false) => {
    const startTime = loading.startLoading('navigation', fromCache, targetPath)
    
    // Set optimistic state for immediate feedback
    if (options.enableOptimisticUI !== false) {
      loading.setOptimisticState(targetPath, 'navigating')
    }
    
    return startTime
  }, [loading, options.enableOptimisticUI])
  
  const completeNavigation = useCallback((startTime?: number, fromCache: boolean = false) => {
    loading.clearOptimisticState()
    loading.stopLoading(startTime, fromCache)
  }, [loading])
  
  return {
    ...loading,
    startNavigation,
    completeNavigation,
    isNavigating: loading.isNavigating
  }
}

/**
 * Hook for managing loading states during file operations
 */
export function useOperationLoading(options: OptimizedLoadingOptions = {}) {
  const loading = useOptimizedLoading({
    ...options,
    minLoadingTime: 300, // Longer for operations
    maxSkeletonTime: 5000,
    skeletonDelay: 200
  })
  
  const startOperation = useCallback((operation: string, target?: string) => {
    const startTime = loading.startLoading('operation', false, target)
    
    if (target && options.enableOptimisticUI !== false) {
      loading.setOptimisticState(target, operation)
    }
    
    return startTime
  }, [loading, options.enableOptimisticUI])
  
  const completeOperation = useCallback((startTime?: number) => {
    loading.clearOptimisticState()
    loading.stopLoading(startTime, false)
  }, [loading])
  
  return {
    ...loading,
    startOperation,
    completeOperation,
    isOperating: loading.isLoading && loading.loadingType === 'operation'
  }
}