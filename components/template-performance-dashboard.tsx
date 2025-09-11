/**
 * Template Performance Dashboard Component
 * 
 * Provides a comprehensive dashboard for monitoring template system
 * performance, errors, and optimization recommendations.
 */

"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Memory, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Info
} from 'lucide-react'
import { useTemplatePerformanceMonitor } from '@/lib/template-performance-monitor'
import { getErrorTracker, getTemplateErrorStats, getActiveTemplateAlerts } from '@/lib/template-error-tracker'
import { getBenchmarkRunner, runTemplateBenchmarks, generateBenchmarkReport } from '@/lib/template-benchmark'
import { bundleAnalyzer } from '@/lib/template-bundle-optimizer'

interface PerformanceDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

export function TemplatePerformanceDashboard({
  className,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: PerformanceDashboardProps) {
  const { getReport, metrics } = useTemplatePerformanceMonitor()
  const [performanceReport, setPerformanceReport] = useState(getReport())
  const [errorStats, setErrorStats] = useState(getTemplateErrorStats())
  const [activeAlerts, setActiveAlerts] = useState(getActiveTemplateAlerts())
  const [benchmarkResults, setBenchmarkResults] = useState<any[]>([])
  const [bundleAnalysis, setBundleAnalysis] = useState(bundleAnalyzer.analyzeBundleComposition())
  const [isRunningBenchmarks, setIsRunningBenchmarks] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  // Refresh data
  const refreshData = useCallback(() => {
    setPerformanceReport(getReport())
    setErrorStats(getTemplateErrorStats())
    setActiveAlerts(getActiveTemplateAlerts())
    setBundleAnalysis(bundleAnalyzer.analyzeBundleComposition())
    setLastRefresh(Date.now())
  }, [getReport])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refreshData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshData])

  // Run benchmarks
  const runBenchmarks = useCallback(async () => {
    setIsRunningBenchmarks(true)
    try {
      const results = await runTemplateBenchmarks()
      setBenchmarkResults(results)
    } catch (error) {
      console.error('Failed to run benchmarks:', error)
    } finally {
      setIsRunningBenchmarks(false)
    }
  }, [])

  // Download report
  const downloadReport = useCallback(() => {
    const report = generateBenchmarkReport(benchmarkResults)
    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `template-performance-report-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [benchmarkResults])

  // Get status color based on performance
  const getStatusColor = (value: number, threshold: number, reverse = false) => {
    const ratio = value / threshold
    if (reverse) {
      return ratio > 1.5 ? 'destructive' : ratio > 1.2 ? 'warning' : 'success'
    }
    return ratio < 0.8 ? 'success' : ratio < 1.2 ? 'warning' : 'destructive'
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Template Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and optimize template system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={downloadReport} disabled={benchmarkResults.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Active Performance Alerts</AlertTitle>
          <AlertDescription>
            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''} require attention.
            <div className="mt-2 space-y-1">
              {activeAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="text-sm">
                  • {alert.message}
                </div>
              ))}
              {activeAlerts.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{activeAlerts.length - 3} more alerts
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="bundle">Bundle</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Render Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceReport.summary.render?.average.toFixed(1) || '0'}ms
                </div>
                <Badge variant={getStatusColor(performanceReport.summary.render?.average || 0, 16)}>
                  Target: &lt;16ms
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Memory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performanceReport.summary.memory?.average.toFixed(1) || '0'}MB
                </div>
                <Badge variant={getStatusColor(performanceReport.summary.memory?.average || 0, 50)}>
                  Target: &lt;50MB
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{errorStats.total}</div>
                <Badge variant={errorStats.total > 10 ? 'destructive' : errorStats.total > 5 ? 'warning' : 'success'}>
                  Last 24h
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bundle Size</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(bundleAnalysis.totalSize / 1024).toFixed(0)}KB
                </div>
                <Badge variant={getStatusColor(bundleAnalysis.totalSize / 1024, 500)}>
                  Target: &lt;500KB
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Performance Budget Status */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Budget Status</CardTitle>
              <CardDescription>
                Current performance against defined budgets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceReport.budget.map(item => (
                  <div key={item.metric} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.metric}</span>
                      {item.status === 'pass' ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(item.current / item.budget) * 100} 
                        className="w-24"
                      />
                      <Badge variant={item.status === 'pass' ? 'success' : 'destructive'}>
                        {item.current.toFixed(1)} / {item.budget}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance breakdown by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(performanceReport.summary).map(([category, data]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-sm text-muted-foreground">
                          {data.count} samples
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-muted-foreground">Average</div>
                          <div className="font-medium">{data.average.toFixed(1)}ms</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Max</div>
                          <div className="font-medium">{data.max.toFixed(1)}ms</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <Badge variant={getStatusColor(data.average, category === 'render' ? 16 : 100)}>
                            {data.average < (category === 'render' ? 16 : 100) ? 'Good' : 'Slow'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Metrics</CardTitle>
                <CardDescription>
                  Last {metrics.length} performance measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {metrics.slice(-20).reverse().map((metric, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {metric.category}
                          </Badge>
                          <span>{metric.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{metric.value.toFixed(1)}ms</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(metric.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Statistics</CardTitle>
                <CardDescription>
                  Error breakdown and recovery rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{errorStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total Errors</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {(errorStats.recoveryRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Recovery Rate</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Errors by Type</h4>
                    {Object.entries(errorStats.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Errors by Severity</h4>
                    {Object.entries(errorStats.bySeverity).map(([severity, count]) => (
                      <div key={severity} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{severity}</span>
                        <Badge variant={
                          severity === 'critical' ? 'destructive' :
                          severity === 'high' ? 'warning' : 'outline'
                        }>
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>
                  Latest error occurrences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {errorStats.recentErrors.map((error, index) => (
                      <div key={index} className="border rounded p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <Badge variant={
                            error.severity === 'critical' ? 'destructive' :
                            error.severity === 'high' ? 'warning' : 'outline'
                          }>
                            {error.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm">{error.message}</div>
                        {error.component && (
                          <div className="text-xs text-muted-foreground">
                            Component: {error.component}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Benchmarks Tab */}
        <TabsContent value="benchmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Performance Benchmarks
                <Button 
                  onClick={runBenchmarks} 
                  disabled={isRunningBenchmarks}
                  size="sm"
                >
                  {isRunningBenchmarks ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Run Benchmarks
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                Automated performance benchmarks and regression testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {benchmarkResults.length > 0 ? (
                <div className="space-y-6">
                  {benchmarkResults.map((suite, index) => (
                    <div key={index} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{suite.suiteName}</h3>
                        <Badge variant={
                          suite.summary.failedTests === 0 ? 'success' : 'destructive'
                        }>
                          {suite.summary.passedTests}/{suite.summary.totalTests} passed
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Average Time</div>
                          <div className="font-medium">{suite.summary.averageTime.toFixed(2)}ms</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Memory Usage</div>
                          <div className="font-medium">{suite.summary.memoryUsage.toFixed(2)}MB</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total Time</div>
                          <div className="font-medium">{suite.summary.totalTime.toFixed(0)}ms</div>
                        </div>
                      </div>

                      {suite.regressions.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Performance Regressions Detected</AlertTitle>
                          <AlertDescription>
                            <div className="mt-2 space-y-1">
                              {suite.regressions.map((reg: any, regIndex: number) => (
                                <div key={regIndex} className="text-sm">
                                  • {reg.testName}: {reg.regression.toFixed(1)}% slower ({reg.severity})
                                </div>
                              ))}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-2">
                        {suite.results.map((result: any, resultIndex: number) => (
                          <div key={resultIndex} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              {result.passed ? (
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                              ) : (
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                              )}
                              <span>{result.testName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{result.averageTime.toFixed(2)}ms</span>
                              <span className="text-muted-foreground">
                                ({result.iterations} runs)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No benchmark results available.</p>
                  <p className="text-sm">Click "Run Benchmarks" to start performance testing.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundle Tab */}
        <TabsContent value="bundle" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bundle Analysis</CardTitle>
                <CardDescription>
                  Bundle size breakdown and optimization opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">
                        {(bundleAnalysis.totalSize / 1024).toFixed(0)}KB
                      </div>
                      <div className="text-sm text-muted-foreground">Total Size</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {(bundleAnalysis.gzippedSize / 1024).toFixed(0)}KB
                      </div>
                      <div className="text-sm text-muted-foreground">Gzipped</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Components</h4>
                    {bundleAnalysis.components.map(comp => (
                      <div key={comp.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{comp.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {comp.usage}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {(comp.size / 1024).toFixed(1)}KB
                          </span>
                          {comp.splitRecommended && (
                            <Badge variant="warning" className="text-xs">
                              Split
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Optimization Recommendations</CardTitle>
                <CardDescription>
                  Actionable steps to improve bundle performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {bundleAnalysis.recommendations.map((rec, index) => (
                      <div key={index} className="border rounded p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant={
                            rec.impact === 'high' ? 'destructive' :
                            rec.impact === 'medium' ? 'warning' : 'outline'
                          }>
                            {rec.type.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {rec.impact} impact
                          </Badge>
                        </div>
                        <div className="text-sm font-medium">{rec.component}</div>
                        <div className="text-sm text-muted-foreground">
                          {rec.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <Info className="h-3 w-3 inline mr-1" />
                          {rec.implementation}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground text-center mt-6">
        Last updated: {new Date(lastRefresh).toLocaleString()}
      </div>
    </div>
  )
}

export default TemplatePerformanceDashboard