"use client"

import { useState, useEffect } from "react"
import { Activity, Database, Clock, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { templateCacheManager, type CacheStats } from "@/lib/template-system/cache-manager"
import { placeholderEngine, type PerformanceMetrics } from "@/lib/template-system/placeholder-engine"

interface TemplatePerformanceMonitorProps {
  className?: string
}

export function TemplatePerformanceMonitor({ className }: TemplatePerformanceMonitorProps) {
  const [cacheStats, setCacheStats] = useState<Record<string, CacheStats>>({})
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    suggestionTime: 0,
    validationTime: 0,
    cacheHitRate: 0
  })
  const [isVisible, setIsVisible] = useState(false)

  // Update stats every 2 seconds when visible
  useEffect(() => {
    if (!isVisible) return

    const updateStats = () => {
      setCacheStats(templateCacheManager.getAllStats())
      setPerformanceMetrics(placeholderEngine.getPerformanceMetrics())
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [isVisible])

  const handleClearCache = () => {
    templateCacheManager.clearAll()
    setCacheStats(templateCacheManager.getAllStats())
  }

  const handleCleanupCache = () => {
    templateCacheManager.cleanupAll()
    setCacheStats(templateCacheManager.getAllStats())
  }

  const getTotalCacheSize = () => {
    return Object.values(cacheStats).reduce((sum, stats) => sum + stats.size, 0)
  }

  const getAverageHitRate = () => {
    const rates = Object.values(cacheStats).map(stats => stats.hitRate).filter(rate => !isNaN(rate))
    return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0
  }

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className={className}
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance Monitor
      </Button>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Template System Performance
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCleanupCache}>
              <Database className="h-4 w-4 mr-1" />
              Cleanup
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              Clear Cache
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Performance Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {performanceMetrics.suggestionTime.toFixed(1)}ms
            </div>
            <div className="text-xs text-muted-foreground">Autocomplete</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {performanceMetrics.validationTime.toFixed(1)}ms
            </div>
            <div className="text-xs text-muted-foreground">Validation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(getAverageHitRate() * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">Cache Hit Rate</div>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Cache Statistics</h4>
            <Badge variant="outline">
              {getTotalCacheSize()} entries
            </Badge>
          </div>
          
          {Object.entries(cacheStats).map(([cacheType, stats]) => (
            <div key={cacheType} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{cacheType}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {stats.size}
                  </Badge>
                  <Badge 
                    variant={stats.hitRate > 0.7 ? "default" : stats.hitRate > 0.4 ? "secondary" : "destructive"}
                    className="text-xs"
                  >
                    {Math.round(stats.hitRate * 100)}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={stats.hitRate * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Hits: {stats.hits}</span>
                <span>Misses: {stats.misses}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Recommendations */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Recommendations
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            {getAverageHitRate() < 0.5 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <span>Low cache hit rate - consider preloading common data</span>
              </div>
            )}
            {performanceMetrics.suggestionTime > 50 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Slow autocomplete - increase debounce delay</span>
              </div>
            )}
            {getTotalCacheSize() > 800 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>High cache usage - consider cleanup</span>
              </div>
            )}
            {getAverageHitRate() > 0.8 && performanceMetrics.suggestionTime < 20 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Excellent performance!</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}