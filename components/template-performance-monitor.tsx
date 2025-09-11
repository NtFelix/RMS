/**
 * Template performance monitoring component
 * Provides real-time performance metrics and optimization suggestions
 */

"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { 
  Activity, 
  Clock, 
  Database, 
  Search, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { optimizedTemplateLoader } from '@/lib/template-performance-optimizer'
import { templateCacheService } from '@/lib/template-cache'

interface PerformanceMetrics {
  loadTime: number
  searchTime: number
  filterTime: number
  renderTime: number
  cacheHitRate: number
  totalOperations: number
  searchIndexSize: number
  memoryUsage?: number
}

interface PerformanceAlert {
  type: 'warning' | 'error' | 'info'
  message: string
  suggestion?: string
  metric?: string
}

/**
 * Performance monitoring dashboard for template operations
 */
export function TemplatePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout>()

  // Collect performance metrics
  const collectMetrics = () => {
    try {
      const loaderMetrics = optimizedTemplateLoader.getPerformanceMetrics()
      const cacheStats = templateCacheService.getCacheStats()
      
      const combinedMetrics: PerformanceMetrics = {
        ...loaderMetrics,
        memoryUsage: getMemoryUsage()
      }

      setMetrics(combinedMetrics)
      analyzePerformance(combinedMetrics, cacheStats)
    } catch (error) {
      console.error('Error collecting performance metrics:', error)
    }
  }

  // Get memory usage if available
  const getMemoryUsage = (): number | undefined => {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory
      return memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
    }
    return undefined
  }

  // Analyze performance and generate alerts
  const analyzePerformance = (metrics: PerformanceMetrics, cacheStats: any) => {
    const newAlerts: PerformanceAlert[] = []

    // Check load time
    if (metrics.loadTime > 1000) {
      newAlerts.push({
        type: 'warning',
        message: 'Template loading is slow',
        suggestion: 'Consider enabling caching or reducing template size',
        metric: `${metrics.loadTime.toFixed(0)}ms`
      })
    }

    // Check search performance
    if (metrics.searchTime > 500) {
      newAlerts.push({
        type: 'warning',
        message: 'Search performance is degraded',
        suggestion: 'Search index may need rebuilding',
        metric: `${metrics.searchTime.toFixed(0)}ms`
      })
    }

    // Check cache hit rate
    if (metrics.cacheHitRate < 0.5 && metrics.totalOperations > 10) {
      newAlerts.push({
        type: 'info',
        message: 'Low cache hit rate',
        suggestion: 'Cache configuration may need adjustment',
        metric: `${(metrics.cacheHitRate * 100).toFixed(1)}%`
      })
    }

    // Check memory usage
    if (metrics.memoryUsage && metrics.memoryUsage > 100) {
      newAlerts.push({
        type: 'warning',
        message: 'High memory usage detected',
        suggestion: 'Consider clearing caches or reducing template data',
        metric: `${metrics.memoryUsage.toFixed(1)}MB`
      })
    }

    // Check search index size
    if (metrics.searchIndexSize > 1000) {
      newAlerts.push({
        type: 'info',
        message: 'Large search index',
        suggestion: 'Index cleanup may improve performance',
        metric: `${metrics.searchIndexSize} entries`
      })
    }

    // Positive feedback for good performance
    if (metrics.loadTime < 200 && metrics.searchTime < 100 && metrics.cacheHitRate > 0.8) {
      newAlerts.push({
        type: 'info',
        message: 'Excellent performance',
        suggestion: 'All metrics are within optimal ranges'
      })
    }

    setAlerts(newAlerts)
  }

  // Format time values
  const formatTime = (ms: number): string => {
    if (ms < 1) return '<1ms'
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Get performance status color
  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Clear all caches and reset metrics
  const handleClearCaches = () => {
    templateCacheService.clearAllCaches()
    optimizedTemplateLoader.clearAll()
    collectMetrics()
  }

  // Reset performance metrics
  const handleResetMetrics = () => {
    optimizedTemplateLoader.resetPerformanceMetrics()
    collectMetrics()
  }

  // Auto-refresh metrics
  useEffect(() => {
    if (autoRefresh && isVisible) {
      collectMetrics()
      intervalRef.current = setInterval(collectMetrics, 5000) // Update every 5 seconds
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, isVisible])

  // Initial metrics collection
  useEffect(() => {
    collectMetrics()
  }, [])

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'text-green-600' : 'text-muted-foreground'}
              >
                {autoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Performance Metrics */}
          {metrics && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Load Time</span>
                  </div>
                  <div className={`text-lg font-mono ${getStatusColor(metrics.loadTime, { good: 200, warning: 500 })}`}>
                    {formatTime(metrics.loadTime)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Search Time</span>
                  </div>
                  <div className={`text-lg font-mono ${getStatusColor(metrics.searchTime, { good: 50, warning: 200 })}`}>
                    {formatTime(metrics.searchTime)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                  </div>
                  <div className={`text-lg font-mono ${metrics.cacheHitRate > 0.7 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {formatPercentage(metrics.cacheHitRate)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Operations</span>
                  </div>
                  <div className="text-lg font-mono text-foreground">
                    {metrics.totalOperations}
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              {metrics.memoryUsage && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Memory Usage</span>
                    <span className="text-sm font-mono">
                      {metrics.memoryUsage.toFixed(1)}MB
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(metrics.memoryUsage / 2, 100)} 
                    className="h-2"
                  />
                </div>
              )}

              {/* Search Index Size */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Search Index</span>
                <span className="font-mono">{metrics.searchIndexSize} entries</span>
              </div>
            </div>
          )}

          {/* Performance Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Alerts</h4>
              <div className="space-y-2 max-h-32 overflow-auto">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md text-xs ${
                      alert.type === 'error' 
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : alert.type === 'warning'
                        ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.type === 'error' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                      {alert.type === 'info' && <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                      <div className="flex-1">
                        <div className="font-medium">{alert.message}</div>
                        {alert.suggestion && (
                          <div className="text-xs opacity-80 mt-1">{alert.suggestion}</div>
                        )}
                        {alert.metric && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {alert.metric}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={collectMetrics}
              className="flex-1"
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetMetrics}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCaches}
              className="flex-1"
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Hook for performance monitoring
 */
export function useTemplatePerformanceMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)

  const startMonitoring = () => {
    setIsMonitoring(true)
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
  }

  const collectMetrics = () => {
    const loaderMetrics = optimizedTemplateLoader.getPerformanceMetrics()
    setMetrics(loaderMetrics)
    return loaderMetrics
  }

  return {
    isMonitoring,
    metrics,
    startMonitoring,
    stopMonitoring,
    collectMetrics
  }
}