'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useDebouncedBulkOperations } from '@/hooks/use-debounced-bulk-operations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Clock, 
  Zap, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkOperationsPerformanceMonitorProps {
  className?: string
  showDetailedMetrics?: boolean
  alertThresholds?: {
    renderTime?: number
    batchProcessingTime?: number
    memoryUsage?: number
  }
}

/**
 * Performance monitoring component for bulk operations
 * Only renders in development mode to avoid production overhead
 */
export function BulkOperationsPerformanceMonitor({
  className,
  showDetailedMetrics = false,
  alertThresholds = {
    renderTime: 16, // 60fps threshold
    batchProcessingTime: 10,
    memoryUsage: 100 // MB
  }
}: BulkOperationsPerformanceMonitorProps) {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const {
    performanceMetrics,
    state,
    resetPerformanceMetrics
  } = useDebouncedBulkOperations({
    enablePerformanceMonitoring: true
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [performanceHistory, setPerformanceHistory] = useState<Array<{
    timestamp: number
    renderTime: number
    batchTime: number
    selectedCount: number
  }>>([])

  // Track performance history
  useEffect(() => {
    if (performanceMetrics.lastRenderTime > 0) {
      setPerformanceHistory(prev => {
        const newEntry = {
          timestamp: Date.now(),
          renderTime: performanceMetrics.averageRenderTime,
          batchTime: performanceMetrics.batchProcessingTime,
          selectedCount: state.selectedIds.size
        }
        
        // Keep only last 50 entries
        const updated = [...prev, newEntry].slice(-50)
        return updated
      })
    }
  }, [performanceMetrics.lastRenderTime, performanceMetrics.averageRenderTime, performanceMetrics.batchProcessingTime, state.selectedIds.size])

  // Calculate performance status
  const performanceStatus = useMemo(() => {
    const { averageRenderTime, batchProcessingTime } = performanceMetrics
    
    const renderTimeStatus = averageRenderTime > alertThresholds.renderTime! ? 'warning' : 'good'
    const batchTimeStatus = batchProcessingTime > alertThresholds.batchProcessingTime! ? 'warning' : 'good'
    
    if (renderTimeStatus === 'warning' || batchTimeStatus === 'warning') {
      return 'warning'
    }
    
    return 'good'
  }, [performanceMetrics, alertThresholds])

  // Calculate performance trends
  const performanceTrend = useMemo(() => {
    if (performanceHistory.length < 10) return 'stable'
    
    const recent = performanceHistory.slice(-10)
    const older = performanceHistory.slice(-20, -10)
    
    if (older.length === 0) return 'stable'
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.renderTime, 0) / recent.length
    const olderAvg = older.reduce((sum, entry) => sum + entry.renderTime, 0) / older.length
    
    const improvement = ((olderAvg - recentAvg) / olderAvg) * 100
    
    if (improvement > 10) return 'improving'
    if (improvement < -10) return 'degrading'
    return 'stable'
  }, [performanceHistory])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'degrading':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 w-80 z-50 shadow-lg", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon(performanceStatus)}
            <span>Bulk Operations Performance</span>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon(performanceTrend)}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? '−' : '+'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Basic Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-semibold">{state.selectedIds.size}</div>
            <div className="text-xs text-muted-foreground">Selected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{performanceMetrics.renderCount}</div>
            <div className="text-xs text-muted-foreground">Renders</div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Render Time</span>
            </div>
            <Badge variant={performanceMetrics.averageRenderTime > alertThresholds.renderTime! ? 'destructive' : 'secondary'}>
              {performanceMetrics.averageRenderTime.toFixed(1)}ms
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">Batch Time</span>
            </div>
            <Badge variant={performanceMetrics.batchProcessingTime > alertThresholds.batchProcessingTime! ? 'destructive' : 'secondary'}>
              {performanceMetrics.batchProcessingTime.toFixed(1)}ms
            </Badge>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && showDetailedMetrics && (
          <div className="space-y-3 border-t pt-3">
            {/* Render Time Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Render Performance</span>
                <span>{Math.min(100, (alertThresholds.renderTime! / Math.max(performanceMetrics.averageRenderTime, 1)) * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(100, (alertThresholds.renderTime! / Math.max(performanceMetrics.averageRenderTime, 1)) * 100)}
                className="h-2"
              />
            </div>

            {/* Batch Processing Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Batch Performance</span>
                <span>{Math.min(100, (alertThresholds.batchProcessingTime! / Math.max(performanceMetrics.batchProcessingTime, 1)) * 100).toFixed(0)}%</span>
              </div>
              <Progress 
                value={Math.min(100, (alertThresholds.batchProcessingTime! / Math.max(performanceMetrics.batchProcessingTime, 1)) * 100)}
                className="h-2"
              />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{performanceMetrics.pendingSelectionsCount}</div>
                <div className="text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{performanceHistory.length}</div>
                <div className="text-muted-foreground">History</div>
              </div>
            </div>

            {/* Performance Trend */}
            <div className="text-xs">
              <div className="flex items-center justify-between mb-1">
                <span>Trend</span>
                <Badge variant="outline" className="text-xs">
                  {performanceTrend}
                </Badge>
              </div>
              {performanceHistory.length > 0 && (
                <div className="h-8 flex items-end gap-px">
                  {performanceHistory.slice(-20).map((entry, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex-1 bg-blue-200 rounded-sm",
                        entry.renderTime > alertThresholds.renderTime! && "bg-red-200"
                      )}
                      style={{
                        height: `${Math.min(100, (entry.renderTime / alertThresholds.renderTime!) * 100)}%`
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetPerformanceMetrics}
                className="flex-1 text-xs"
              >
                Reset Metrics
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPerformanceHistory([])}
                className="flex-1 text-xs"
              >
                Clear History
              </Button>
            </div>
          </div>
        )}

        {/* Performance Warnings */}
        {performanceStatus === 'warning' && (
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
            <div className="flex items-center gap-1 font-semibold text-yellow-800">
              <AlertTriangle className="h-3 w-3" />
              Performance Warning
            </div>
            <div className="text-yellow-700 mt-1">
              {performanceMetrics.averageRenderTime > alertThresholds.renderTime! && 
                "Render time is above optimal threshold. "
              }
              {performanceMetrics.batchProcessingTime > alertThresholds.batchProcessingTime! && 
                "Batch processing is slower than expected. "
              }
              Consider reducing dataset size or enabling virtualization.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Hook for integrating performance monitoring into existing components
 */
export function useBulkOperationsPerformanceMonitoring() {
  const { performanceMetrics, resetPerformanceMetrics } = useDebouncedBulkOperations({
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development'
  })

  const [alerts, setAlerts] = useState<string[]>([])

  useEffect(() => {
    const newAlerts: string[] = []

    if (performanceMetrics.averageRenderTime > 16) {
      newAlerts.push('High render time detected')
    }

    if (performanceMetrics.batchProcessingTime > 10) {
      newAlerts.push('Slow batch processing detected')
    }

    if (performanceMetrics.pendingSelectionsCount > 50) {
      newAlerts.push('Large number of pending selections')
    }

    setAlerts(newAlerts)
  }, [performanceMetrics])

  return {
    performanceMetrics,
    alerts,
    resetPerformanceMetrics,
    hasPerformanceIssues: alerts.length > 0
  }
}