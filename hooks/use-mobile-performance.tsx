'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useIsMobile } from './use-mobile'

// Performance monitoring utilities for mobile devices
export interface PerformanceMetrics {
  renderTime: number
  animationFrames: number
  memoryUsage?: number
  isLowEndDevice: boolean
}

/**
 * Hook for monitoring mobile performance and optimizing accordingly
 */
export function useMobilePerformance() {
  const isMobile = useIsMobile()
  const renderStartTime = useRef<number>(Date.now())
  const animationFrameCount = useRef<number>(0)
  const performanceObserver = useRef<PerformanceObserver | null>(null)

  // Detect low-end devices based on hardware capabilities
  const isLowEndDevice = useMemo(() => {
    if (typeof window === 'undefined') return false
    
    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 1
    
    // Check for device memory (if available)
    const memory = (navigator as any).deviceMemory || 1
    
    // Check for connection type (if available)
    const connection = (navigator as any).connection
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g'
    
    // Consider device low-end if it has <= 2 cores, <= 1GB RAM, or slow connection
    return cores <= 2 || memory <= 1 || isSlowConnection
  }, [])

  // Optimized animation frame counter
  const startAnimationFrameCounter = useCallback(() => {
    if (!isMobile || typeof performance === 'undefined') return
    
    let frameId: number
    const startTime = performance.now()
    
    const countFrames = () => {
      animationFrameCount.current++
      frameId = requestAnimationFrame(countFrames)
      
      // Stop counting after 1 second
      if (performance.now() - startTime > 1000) {
        cancelAnimationFrame(frameId)
      }
    }
    
    frameId = requestAnimationFrame(countFrames)
    
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId)
      }
    }
  }, [isMobile])

  // Performance observer for measuring paint and layout metrics
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return

    try {
      performanceObserver.current = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        entries.forEach((entry) => {
          // Log performance metrics for debugging
          if (process.env.NODE_ENV === 'development') {
            console.log(`Performance: ${entry.name} - ${entry.duration}ms`)
          }
        })
      })

      // Observe paint and navigation timing
      performanceObserver.current.observe({ 
        entryTypes: ['paint', 'navigation', 'measure'] 
      })
    } catch (error) {
      // Performance Observer not supported
      console.warn('Performance Observer not supported:', error)
    }

    return () => {
      if (performanceObserver.current) {
        performanceObserver.current.disconnect()
      }
    }
  }, [isMobile])

  // Get current performance metrics
  const getPerformanceMetrics = useCallback((): PerformanceMetrics => {
    const renderTime = Date.now() - renderStartTime.current
    
    // Get memory usage if available
    let memoryUsage: number | undefined
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }

    return {
      renderTime,
      animationFrames: animationFrameCount.current,
      memoryUsage,
      isLowEndDevice
    }
  }, [isLowEndDevice])

  // Reset performance counters
  const resetMetrics = useCallback(() => {
    renderStartTime.current = Date.now()
    animationFrameCount.current = 0
  }, [])

  return {
    isLowEndDevice,
    getPerformanceMetrics,
    resetMetrics,
    startAnimationFrameCounter
  }
}

/**
 * Hook for optimizing animations based on device performance
 */
export function useOptimizedAnimations() {
  const { isLowEndDevice } = useMobilePerformance()
  const isMobile = useIsMobile()

  // Reduce animation complexity on low-end devices
  const animationConfig = useMemo(() => {
    // Check for low-end device first, regardless of mobile/desktop
    if (isLowEndDevice) {
      return {
        duration: 150, // Shorter animations
        easing: 'ease-out', // Simpler easing
        reducedMotion: true
      }
    }

    if (!isMobile) {
      return {
        duration: 250, // Standard desktop duration
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        reducedMotion: false
      }
    }

    return {
      duration: 200, // Slightly shorter than desktop for mobile
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Optimized for mobile
      reducedMotion: false
    }
  }, [isMobile, isLowEndDevice])

  // Check for user's reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  return {
    ...animationConfig,
    shouldReduceMotion: prefersReducedMotion || animationConfig.reducedMotion
  }
}

/**
 * Hook for debouncing expensive operations on mobile
 */
export function useMobileDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const isMobile = useIsMobile()
  const { isLowEndDevice } = useMobilePerformance()
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Increase delay on low-end devices
  const adjustedDelay = useMemo(() => {
    if (!isMobile) return delay
    return isLowEndDevice ? delay * 1.5 : delay
  }, [isMobile, isLowEndDevice, delay])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, adjustedDelay)
    },
    [callback, adjustedDelay]
  ) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Hook for throttling scroll and touch events on mobile
 */
export function useMobileThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number = 16 // ~60fps
): T {
  const isMobile = useIsMobile()
  const { isLowEndDevice } = useMobilePerformance()
  const inThrottle = useRef<boolean>(false)

  // Increase throttle limit on low-end devices
  const adjustedLimit = useMemo(() => {
    if (!isMobile) return limit
    return isLowEndDevice ? limit * 2 : limit // 30fps on low-end devices
  }, [isMobile, isLowEndDevice, limit])

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args)
        inThrottle.current = true
        
        setTimeout(() => {
          inThrottle.current = false
        }, adjustedLimit)
      }
    },
    [callback, adjustedLimit]
  ) as T

  return throttledCallback
}