'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDirectoryCache } from '@/hooks/use-cloud-storage-navigation'
import { Activity, Database, TrendingUp, Clock, Zap, Target } from 'lucide-react'

interface CacheMetrics {
  hitRate: number
  memoryUsage: number
  entryCount: number
  preloadHitRate: number
  cacheEfficiency: number
  backgroundPrefetchCount: number
  averageLoadTime: number
  navigationPatternAccuracy: number
}

export function CachePerformanceMonitor() {
  const { cacheStats, navigationPatterns, pendingPreloads, cacheEfficiency, preloadHitRate } = useDirectoryCache()
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hitRate: 0,
    memoryUsage: 0,
    entryCount: 0,
    preloadHitRate: 0,
    cacheEfficiency: 0,
    backgroundPrefetchCount: 0,
    averageLoadTime: 0,
    navigationPatternAccuracy: 0
  })

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        hitRate: (cacheStats.hitRate * 100) || 0,
        memoryUsage: cacheStats.memoryUsage / (1024 * 1024), // Convert to MB
        entryCount: cacheStats.entryCount,
        preloadHitRate: (preloadHitRate * 100) || 0,
        cacheEfficiency: cacheEfficiency || 0,
        backgroundPrefetchCount: cacheStats.backgroundPrefetchCount || 0,
        averageLoadTime: cacheStats.averageLoadTime || 0,
        navigationPatternAccuracy: cacheStats.navigationPatternAccuracy || 0
      })
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [cacheStats, preloadHitRate, cacheEfficiency])

  const getPerformanceColor = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'text-green-600'
    if (value >= thresholds.fair) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (value: number, thresholds: { good: number; fair: number }) => {
    if (value >= thresholds.good) return 'default'
    if (value >= thresholds.fair) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Cache Hit Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getPerformanceColor(metrics.hitRate, { good: 80, fair: 60 })}>
              {metrics.hitRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.hitRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {cacheStats.totalHits} hits / {cacheStats.totalRequests} requests
          </p>
        </CardContent>
      </Card>

      {/* Cache Efficiency */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Efficiency</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getPerformanceColor(metrics.cacheEfficiency, { good: 75, fair: 50 })}>
              {metrics.cacheEfficiency.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.cacheEfficiency} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Overall cache performance score
          </p>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.memoryUsage.toFixed(1)} MB
          </div>
          <Progress value={(metrics.memoryUsage / 50) * 100} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics.entryCount} cached entries
          </p>
        </CardContent>
      </Card>

      {/* Preload Performance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preload Hit Rate</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getPerformanceColor(metrics.preloadHitRate, { good: 40, fair: 20 })}>
              {metrics.preloadHitRate.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.preloadHitRate} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {cacheStats.preloadHits} preload hits
          </p>
        </CardContent>
      </Card>

      {/* Average Load Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getPerformanceColor(1000 - metrics.averageLoadTime, { good: 800, fair: 500 })}>
              {metrics.averageLoadTime.toFixed(0)}ms
            </span>
          </div>
          <div className="mt-2">
            <Badge variant={getPerformanceBadge(1000 - metrics.averageLoadTime, { good: 800, fair: 500 })}>
              {metrics.averageLoadTime < 200 ? 'Excellent' : 
               metrics.averageLoadTime < 500 ? 'Good' : 
               metrics.averageLoadTime < 1000 ? 'Fair' : 'Slow'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Pattern Accuracy */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pattern Accuracy</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getPerformanceColor(metrics.navigationPatternAccuracy, { good: 60, fair: 30 })}>
              {metrics.navigationPatternAccuracy.toFixed(1)}%
            </span>
          </div>
          <Progress value={metrics.navigationPatternAccuracy} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {navigationPatterns.length} learned patterns
          </p>
        </CardContent>
      </Card>

      {/* Background Prefetch Activity */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Background Activity</CardTitle>
          <CardDescription>
            Current prefetch operations and navigation patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-2">Pending Preloads</h4>
              {pendingPreloads.length > 0 ? (
                <div className="space-y-1">
                  {pendingPreloads.slice(0, 5).map((preload: { path: string; reason: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1 mr-2">{preload.path}</span>
                      <Badge variant="outline" className="text-xs">
                        {preload.reason}
                      </Badge>
                    </div>
                  ))}
                  {pendingPreloads.length > 5 && (
                    <p className="text-xs text-muted-foreground">
                      +{pendingPreloads.length - 5} more...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No pending preloads</p>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Top Navigation Patterns</h4>
              {navigationPatterns.length > 0 ? (
                <div className="space-y-1">
                  {navigationPatterns.slice(0, 3).map((pattern: any, index: number) => (
                    <div key={index} className="text-xs">
                      <div className="flex items-center justify-between">
                        <span className="truncate flex-1 mr-2">
                          {pattern.fromPath.split('/').pop()} → {pattern.toPath.split('/').pop()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {pattern.frequency}x
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {navigationPatterns.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{navigationPatterns.length - 3} more patterns
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Learning navigation patterns...</p>
              )}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Background prefetches: {metrics.backgroundPrefetchCount}</span>
              <span>Cache entries: {metrics.entryCount}</span>
              <span>Memory: {metrics.memoryUsage.toFixed(1)} MB</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Hook for accessing cache performance data
export function useCachePerformance() {
  const { cacheStats, navigationPatterns, pendingPreloads, cacheEfficiency, preloadHitRate } = useDirectoryCache()
  
  return {
    metrics: {
      hitRate: (cacheStats.hitRate * 100) || 0,
      memoryUsage: cacheStats.memoryUsage / (1024 * 1024),
      entryCount: cacheStats.entryCount,
      preloadHitRate: (preloadHitRate * 100) || 0,
      cacheEfficiency: cacheEfficiency || 0,
      backgroundPrefetchCount: cacheStats.backgroundPrefetchCount || 0,
      averageLoadTime: cacheStats.averageLoadTime || 0,
      navigationPatternAccuracy: cacheStats.navigationPatternAccuracy || 0
    },
    navigationPatterns,
    pendingPreloads,
    isPerformanceGood: (cacheStats.hitRate * 100) >= 80 && cacheEfficiency >= 75,
    needsOptimization: (cacheStats.hitRate * 100) < 60 || cacheEfficiency < 50
  }
}