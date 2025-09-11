/**
 * Template Performance Monitoring System
 * 
 * Provides comprehensive performance monitoring, analytics, and optimization
 * for template operations with real-time metrics and alerting.
 */

import { useCallback, useRef, useEffect, useState } from 'react'

// Performance metric types
export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  category: 'render' | 'parse' | 'save' | 'load' | 'interaction' | 'memory'
  metadata?: Record<string, any>
}

export interface PerformanceThresholds {
  render: number // ms
  parse: number // ms
  save: number // ms
  load: number // ms
  interaction: number // ms
  memory: number // MB
}

export interface PerformanceBudget {
  bundleSize: number // KB
  initialLoad: number // ms
  firstContentfulPaint: number // ms
  largestContentfulPaint: number // ms
  cumulativeLayoutShift: number
  firstInputDelay: number // ms
}

// Default performance thresholds
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  render: 16, // 60fps
  parse: 100,
  save: 1000,
  load: 500,
  interaction: 100,
  memory: 50 // MB
}

// Performance budget for template system
const PERFORMANCE_BUDGET: PerformanceBudget = {
  bundleSize: 500, // KB
  initialLoad: 2000, // ms
  firstContentfulPaint: 1500, // ms
  largestContentfulPaint: 2500, // ms
  cumulativeLayoutShift: 0.1,
  firstInputDelay: 100 // ms
}

class TemplatePerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private thresholds: PerformanceThresholds
  private observers: PerformanceObserver[] = []
  private isEnabled: boolean
  private maxMetrics: number = 1000

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     typeof window !== 'undefined' && window.location.search.includes('debug=performance')
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    try {
      // Performance observer for navigation timing
      if ('PerformanceObserver' in window) {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming
              this.recordMetric('load', navEntry.loadEventEnd - navEntry.loadEventStart, {
                type: 'navigation',
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                domInteractive: navEntry.domInteractive - navEntry.fetchStart
              })
            }
          }
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navObserver)

        // Performance observer for paint timing
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('render', entry.startTime, {
              type: entry.name,
              entryType: entry.entryType
            })
          }
        })
        paintObserver.observe({ entryTypes: ['paint'] })
        this.observers.push(paintObserver)

        // Performance observer for largest contentful paint
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('render', entry.startTime, {
              type: 'largest-contentful-paint',
              size: (entry as any).size,
              element: (entry as any).element?.tagName
            })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)

        // Performance observer for layout shifts
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('render', (entry as any).value, {
              type: 'cumulative-layout-shift',
              hadRecentInput: (entry as any).hadRecentInput,
              sources: (entry as any).sources?.length || 0
            })
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })
        this.observers.push(clsObserver)
      }

      // Memory monitoring
      this.startMemoryMonitoring()
    } catch (error) {
      console.warn('Failed to initialize performance observers:', error)
    }
  }

  private startMemoryMonitoring() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        
        this.recordMetric('memory', usedMB, {
          totalHeapSize: memory.totalJSHeapSize / 1024 / 1024,
          heapSizeLimit: memory.jsHeapSizeLimit / 1024 / 1024
        })

        // Alert if memory usage is high
        if (usedMB > this.thresholds.memory) {
          this.alertHighMemoryUsage(usedMB)
        }
      }

      // Check memory every 30 seconds
      setInterval(checkMemory, 30000)
      checkMemory() // Initial check
    }
  }

  recordMetric(category: PerformanceMetric['category'], value: number, metadata?: Record<string, any>) {
    if (!this.isEnabled) return

    const metric: PerformanceMetric = {
      name: `template_${category}`,
      value,
      timestamp: Date.now(),
      category,
      metadata
    }

    this.metrics.push(metric)

    // Limit metrics array size
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2)
    }

    // Check thresholds and alert if necessary
    this.checkThreshold(metric)

    // Send to analytics if configured
    this.sendToAnalytics(metric)
  }

  private checkThreshold(metric: PerformanceMetric) {
    const threshold = this.thresholds[metric.category]
    if (metric.value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.name}:`, {
        value: metric.value,
        threshold,
        metadata: metric.metadata
      })

      // Send alert to monitoring service
      this.sendAlert({
        type: 'performance_threshold_exceeded',
        metric: metric.name,
        value: metric.value,
        threshold,
        timestamp: metric.timestamp
      })
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to PostHog if available
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('template_performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_category: metric.category,
        ...metric.metadata
      })
    }

    // Send to custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      }).catch(error => {
        console.warn('Failed to send metric to analytics:', error)
      })
    }
  }

  private sendAlert(alert: any) {
    // Send to error tracking service
    if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_alert',
          ...alert
        })
      }).catch(error => {
        console.warn('Failed to send alert:', error)
      })
    }
  }

  private alertHighMemoryUsage(usedMB: number) {
    console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`)
    
    this.sendAlert({
      type: 'high_memory_usage',
      value: usedMB,
      threshold: this.thresholds.memory,
      timestamp: Date.now()
    })
  }

  getMetrics(category?: PerformanceMetric['category'], limit?: number): PerformanceMetric[] {
    let filtered = category ? this.metrics.filter(m => m.category === category) : this.metrics
    return limit ? filtered.slice(-limit) : filtered
  }

  getAverageMetric(category: PerformanceMetric['category'], timeWindow?: number): number {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    const relevantMetrics = this.metrics.filter(m => 
      m.category === category && m.timestamp >= windowStart
    )

    if (relevantMetrics.length === 0) return 0

    return relevantMetrics.reduce((sum, m) => sum + m.value, 0) / relevantMetrics.length
  }

  getPerformanceReport(): {
    summary: Record<string, { average: number; max: number; count: number }>
    budget: { metric: string; current: number; budget: number; status: 'pass' | 'fail' }[]
    alerts: number
  } {
    const categories: PerformanceMetric['category'][] = ['render', 'parse', 'save', 'load', 'interaction', 'memory']
    const summary: Record<string, { average: number; max: number; count: number }> = {}

    categories.forEach(category => {
      const metrics = this.getMetrics(category)
      if (metrics.length > 0) {
        summary[category] = {
          average: this.getAverageMetric(category),
          max: Math.max(...metrics.map(m => m.value)),
          count: metrics.length
        }
      }
    })

    // Check performance budget
    const budget = [
      { metric: 'Initial Load', current: summary.load?.average || 0, budget: PERFORMANCE_BUDGET.initialLoad },
      { metric: 'Render Time', current: summary.render?.average || 0, budget: PERFORMANCE_BUDGET.firstContentfulPaint },
      { metric: 'Memory Usage', current: summary.memory?.average || 0, budget: PERFORMANCE_BUDGET.bundleSize }
    ].map(item => ({
      ...item,
      status: item.current <= item.budget ? 'pass' as const : 'fail' as const
    }))

    const alerts = this.metrics.filter(m => m.value > this.thresholds[m.category]).length

    return { summary, budget, alerts }
  }

  startProfiling(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      this.recordMetric('interaction', duration, {
        profileName: name,
        startTime,
        endTime
      })
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now()
    
    return fn().then(
      result => {
        this.recordMetric('interaction', performance.now() - startTime, {
          operation: name,
          success: true
        })
        return result
      },
      error => {
        this.recordMetric('interaction', performance.now() - startTime, {
          operation: name,
          success: false,
          error: error.message
        })
        throw error
      }
    )
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics = []
  }
}

// Global performance monitor instance
let globalMonitor: TemplatePerformanceMonitor | null = null

export function getPerformanceMonitor(): TemplatePerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new TemplatePerformanceMonitor()
  }
  return globalMonitor
}

// React hook for performance monitoring
export function useTemplatePerformanceMonitor() {
  const monitor = getPerformanceMonitor()
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])

  const recordMetric = useCallback((category: PerformanceMetric['category'], value: number, metadata?: Record<string, any>) => {
    monitor.recordMetric(category, value, metadata)
    setMetrics(monitor.getMetrics())
  }, [monitor])

  const startProfiling = useCallback((name: string) => {
    return monitor.startProfiling(name)
  }, [monitor])

  const measureAsync = useCallback(<T>(name: string, fn: () => Promise<T>) => {
    return monitor.measureAsync(name, fn)
  }, [monitor])

  const getReport = useCallback(() => {
    return monitor.getPerformanceReport()
  }, [monitor])

  useEffect(() => {
    setMetrics(monitor.getMetrics())
  }, [monitor])

  return {
    recordMetric,
    startProfiling,
    measureAsync,
    getReport,
    metrics,
    monitor
  }
}

// Performance measurement decorators
export function measurePerformance(category: PerformanceMetric['category'], name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const monitor = getPerformanceMonitor()

    descriptor.value = function (...args: any[]) {
      const startTime = performance.now()
      const result = originalMethod.apply(this, args)

      if (result instanceof Promise) {
        return result.finally(() => {
          monitor.recordMetric(category, performance.now() - startTime, {
            method: name || propertyKey,
            args: args.length
          })
        })
      } else {
        monitor.recordMetric(category, performance.now() - startTime, {
          method: name || propertyKey,
          args: args.length
        })
        return result
      }
    }

    return descriptor
  }
}

export { TemplatePerformanceMonitor, DEFAULT_THRESHOLDS, PERFORMANCE_BUDGET }