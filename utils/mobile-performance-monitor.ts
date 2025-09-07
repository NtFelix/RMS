/**
 * Mobile Performance Monitoring Utilities
 * Provides runtime performance monitoring and optimization for mobile devices
 */

export interface PerformanceEntry {
  name: string
  duration: number
  startTime: number
  entryType: string
}

export interface MobilePerformanceReport {
  deviceInfo: {
    userAgent: string
    cores: number
    memory?: number
    connection?: string
    isLowEnd: boolean
  }
  metrics: {
    renderTime: number
    animationFrames: number
    memoryUsage?: number
    paintTiming?: {
      firstPaint?: number
      firstContentfulPaint?: number
    }
  }
  timestamp: number
}

class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor
  private performanceObserver: PerformanceObserver | null = null
  private metrics: Map<string, number[]> = new Map()
  private isMonitoring = false

  private constructor() {
    this.initializeMonitoring()
  }

  public static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor()
    }
    return MobilePerformanceMonitor.instance
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        this.processPerformanceEntries(entries)
      })

      // Observe different types of performance entries
      this.performanceObserver.observe({ 
        entryTypes: ['paint', 'navigation', 'measure', 'mark'] 
      })

      this.isMonitoring = true
    } catch (error) {
      console.warn('Performance monitoring not available:', error)
    }
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach((entry) => {
      const metricName = entry.name || entry.entryType
      
      if (!this.metrics.has(metricName)) {
        this.metrics.set(metricName, [])
      }
      
      this.metrics.get(metricName)!.push(entry.duration)
      
      // Log performance issues in development
      if (process.env.NODE_ENV === 'development') {
        if (entry.duration > 16.67) { // Slower than 60fps
          console.warn(`Performance warning: ${metricName} took ${entry.duration.toFixed(2)}ms`)
        }
      }
    })
  }

  public markStart(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(`${name}-start`)
    }
  }

  public markEnd(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
      performance.mark(`${name}-end`)
      performance.measure(name, `${name}-start`, `${name}-end`)
    }
  }

  public getDeviceInfo(): MobilePerformanceReport['deviceInfo'] {
    const cores = navigator.hardwareConcurrency || 1
    const memory = (navigator as any).deviceMemory
    const connection = (navigator as any).connection
    
    return {
      userAgent: navigator.userAgent,
      cores,
      memory,
      connection: connection?.effectiveType,
      isLowEnd: this.isLowEndDevice()
    }
  }

  private isLowEndDevice(): boolean {
    const cores = navigator.hardwareConcurrency || 1
    const memory = (navigator as any).deviceMemory || 1
    const connection = (navigator as any).connection
    const isSlowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g'
    
    return cores <= 2 || memory <= 1 || isSlowConnection
  }

  public getCurrentMetrics(): MobilePerformanceReport['metrics'] {
    const paintTiming = this.getPaintTiming()
    
    return {
      renderTime: this.getAverageMetric('render') || 0,
      animationFrames: this.getMetricCount('animation-frame') || 0,
      memoryUsage: this.getMemoryUsage(),
      paintTiming
    }
  }

  private getPaintTiming(): MobilePerformanceReport['metrics']['paintTiming'] {
    if (typeof performance === 'undefined' || !performance.getEntriesByType) {
      return undefined
    }

    const paintEntries = performance.getEntriesByType('paint')
    const result: any = {}

    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        result.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        result.firstContentfulPaint = entry.startTime
      }
    })

    return Object.keys(result).length > 0 ? result : undefined
  }

  private getMemoryUsage(): number | undefined {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return undefined
  }

  private getAverageMetric(name: string): number | undefined {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return undefined
    
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  private getMetricCount(name: string): number | undefined {
    const values = this.metrics.get(name)
    return values ? values.length : undefined
  }

  public generateReport(): MobilePerformanceReport {
    return {
      deviceInfo: this.getDeviceInfo(),
      metrics: this.getCurrentMetrics(),
      timestamp: Date.now()
    }
  }

  public clearMetrics(): void {
    this.metrics.clear()
  }

  public destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
      this.performanceObserver = null
    }
    this.isMonitoring = false
    this.clearMetrics()
  }

  // Utility methods for component performance tracking
  public trackComponentRender(componentName: string): () => void {
    this.markStart(`component-${componentName}`)
    
    return () => {
      this.markEnd(`component-${componentName}`)
    }
  }

  public trackAsyncOperation(operationName: string): {
    start: () => void
    end: () => void
  } {
    return {
      start: () => this.markStart(`async-${operationName}`),
      end: () => this.markEnd(`async-${operationName}`)
    }
  }

  // Performance budget checking
  public checkPerformanceBudget(metricName: string, budget: number): boolean {
    const average = this.getAverageMetric(metricName)
    if (average === undefined) return true
    
    const isWithinBudget = average <= budget
    
    if (!isWithinBudget && process.env.NODE_ENV === 'development') {
      console.warn(
        `Performance budget exceeded: ${metricName} average ${average.toFixed(2)}ms > ${budget}ms budget`
      )
    }
    
    return isWithinBudget
  }

  // Adaptive performance optimization
  public getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    const deviceInfo = this.getDeviceInfo()
    const metrics = this.getCurrentMetrics()

    if (deviceInfo.isLowEnd) {
      recommendations.push('Enable reduced motion animations')
      recommendations.push('Increase debounce delays')
      recommendations.push('Reduce animation complexity')
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 0.8) {
      recommendations.push('High memory usage detected - consider lazy loading')
      recommendations.push('Clear unused component state')
    }

    if (metrics.renderTime > 16.67) {
      recommendations.push('Render time exceeds 60fps budget')
      recommendations.push('Consider memoization or virtualization')
    }

    return recommendations
  }
}

// Export singleton instance
export const performanceMonitor = MobilePerformanceMonitor.getInstance()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const trackRender = () => {
    return performanceMonitor.trackComponentRender(componentName)
  }

  const trackAsyncOperation = (operationName: string) => {
    return performanceMonitor.trackAsyncOperation(operationName)
  }

  return {
    trackRender,
    trackAsyncOperation,
    generateReport: () => performanceMonitor.generateReport(),
    getRecommendations: () => performanceMonitor.getOptimizationRecommendations()
  }
}

// Utility for measuring component render time
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function PerformanceTrackedComponent(props: P) {
    const endTracking = performanceMonitor.trackComponentRender(componentName)
    
    React.useEffect(() => {
      return endTracking
    })

    return React.createElement(Component, props)
  }
}

// Performance monitoring for development
if (process.env.NODE_ENV === 'development') {
  // Log performance report every 30 seconds
  setInterval(() => {
    const report = performanceMonitor.generateReport()
    console.group('📊 Mobile Performance Report')
    console.log('Device Info:', report.deviceInfo)
    console.log('Metrics:', report.metrics)
    console.log('Recommendations:', performanceMonitor.getOptimizationRecommendations())
    console.groupEnd()
  }, 30000)
}