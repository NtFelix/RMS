"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Clock, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react'
import { 
  performanceMonitor, 
  cacheManager, 
  getMemoryUsage, 
  getConnectionQuality 
} from '@/lib/storage-performance'
import { errorLogger, checkStorageHealth } from '@/lib/storage-error-handling'

interface PerformanceDashboardProps {
  className?: string
}

export function StoragePerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [stats, setStats] = useState<any>(null)
  const [cacheStats, setCacheStats] = useState<any>(null)
  const [errorStats, setErrorStats] = useState<any>(null)
  const [memoryUsage, setMemoryUsage] = useState<any>(null)
  const [connectionQuality, setConnectionQuality] = useState<string>('unknown')
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(performanceMonitor.getStats())
      setCacheStats(cacheManager.getCacheStats())
      setErrorStats(errorLogger.getErrorStats())
      setMemoryUsage(getMemoryUsage())
      setConnectionQuality(getConnectionQuality())
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)
    
    return () => clearInterval(interval)
  }, [])

  // Check health status
  const checkHealth = async () => {
    setIsRefreshing(true)
    try {
      const health = await checkStorageHealth()
      setHealthStatus(health)
    } catch (error) {
      setHealthStatus({ healthy: false, error: 'Health check failed' })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const getHealthStatusColor = () => {
    if (!healthStatus) return 'text-gray-500'
    return healthStatus.healthy ? 'text-green-500' : 'text-red-500'
  }

  const getHealthStatusIcon = () => {
    if (!healthStatus) return <Clock className="h-4 w-4" />
    return healthStatus.healthy ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
  }

  const getPerformanceGrade = () => {
    if (!stats) return 'N/A'
    
    const avgTime = stats.averageQueryTime
    if (avgTime < 500) return 'A'
    if (avgTime < 1000) return 'B'
    if (avgTime < 2000) return 'C'
    return 'D'
  }

  const getPerformanceGradeColor = () => {
    const grade = getPerformanceGrade()
    switch (grade) {
      case 'A': return 'text-green-500'
      case 'B': return 'text-blue-500'
      case 'C': return 'text-yellow-500'
      case 'D': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Dashboard</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={checkHealth}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <div className={getHealthStatusColor()}>
              {getHealthStatusIcon()}
            </div>
            <span className="ml-2">System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getHealthStatusColor()}`}>
                {healthStatus?.healthy ? 'Online' : 'Offline'}
              </div>
              <div className="text-xs text-muted-foreground">Service Status</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {healthStatus?.latency || 0}ms
              </div>
              <div className="text-xs text-muted-foreground">Latenz</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPerformanceGradeColor()}`}>
                {getPerformanceGrade()}
              </div>
              <div className="text-xs text-muted-foreground">Performance</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold">
                {connectionQuality === 'fast' ? (
                  <TrendingUp className="h-6 w-6 text-green-500 mx-auto" />
                ) : connectionQuality === 'slow' ? (
                  <TrendingDown className="h-6 w-6 text-red-500 mx-auto" />
                ) : (
                  <Activity className="h-6 w-6 text-gray-500 mx-auto" />
                )}
              </div>
              <div className="text-xs text-muted-foreground">Verbindung</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Query Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Durchschnittliche Zeit</span>
                <Badge variant={stats.averageQueryTime < 1000 ? 'default' : 'destructive'}>
                  {Math.round(stats.averageQueryTime)}ms
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Gesamt Queries</span>
                <span className="font-medium">{stats.totalQueries}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Langsame Queries</span>
                <Badge variant={stats.slowQueries > 0 ? 'destructive' : 'default'}>
                  {stats.slowQueries}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Database className="mr-2 h-4 w-4" />
                Cache Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Hit Rate</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={(stats.cacheHitRate || 0) * 100} 
                    className="w-16 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {Math.round((stats.cacheHitRate || 0) * 100)}%
                  </span>
                </div>
              </div>
              
              {cacheStats && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Einträge</span>
                    <span className="font-medium">
                      {cacheStats.fileList?.validEntries || 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Auslastung</span>
                    <Progress 
                      value={cacheStats.fileList ? 
                        (cacheStats.fileList.totalEntries / cacheStats.fileList.maxSize) * 100 : 0
                      } 
                      className="w-16 h-2" 
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Statistics */}
      {errorStats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <AlertTriangle className="mr-2 h-4 w-4" />
              Error Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  {errorStats.recentErrors}
                </div>
                <div className="text-xs text-muted-foreground">Letzte Stunde</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {errorStats.totalErrors}
                </div>
                <div className="text-xs text-muted-foreground">Gesamt</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {Math.round((stats?.errorRate || 0) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Error Rate</div>
              </div>
              
              <div className="text-center">
                <div className="text-sm font-medium truncate">
                  {errorStats.mostCommonError || 'Keine'}
                </div>
                <div className="text-xs text-muted-foreground">Häufigster Fehler</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Usage */}
      {memoryUsage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Zap className="mr-2 h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Heap Usage</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={memoryUsage.usagePercentage} 
                    className="w-24 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {Math.round(memoryUsage.usagePercentage)}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Used Memory</span>
                <span className="font-medium">
                  {Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024)}MB
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Memory</span>
                <span className="font-medium">
                  {Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024)}MB
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cache Management</CardTitle>
          <CardDescription>
            Verwalten Sie den Cache für optimale Performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                cacheManager.clearAllCaches()
                setStats(performanceMonitor.getStats())
                setCacheStats(cacheManager.getCacheStats())
              }}
            >
              Cache leeren
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                performanceMonitor.reset()
                errorLogger.clear()
                setStats(performanceMonitor.getStats())
                setErrorStats(errorLogger.getErrorStats())
              }}
            >
              Statistiken zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}