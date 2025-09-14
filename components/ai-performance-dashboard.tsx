/**
 * AI Performance Dashboard Component
 * 
 * Displays real-time performance metrics for the AI assistant,
 * including response times, bundle sizes, and optimization suggestions.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Zap, 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Database,
  Wifi,
  BarChart3
} from 'lucide-react';
import { usePostHog } from 'posthog-js/react';
import { createAIPerformanceMonitor } from '@/lib/ai-performance-monitor';
import { createBundleSizeMonitor } from '@/lib/bundle-size-monitor';

interface PerformanceStats {
  responseTime: {
    average: number;
    p95: number;
    category: string;
  };
  bundleSize: {
    total: number;
    aiComponent: number;
    category: string;
  };
  successRate: number;
  cacheHitRate: number;
  activeRequests: number;
}

interface OptimizationSuggestion {
  type: 'performance' | 'bundle' | 'cache';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpact: string;
}

export function AIPerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats>({
    responseTime: { average: 0, p95: 0, category: 'good' },
    bundleSize: { total: 0, aiComponent: 0, category: 'small' },
    successRate: 100,
    cacheHitRate: 0,
    activeRequests: 0
  });
  
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  
  const posthog = usePostHog();
  const performanceMonitor = createAIPerformanceMonitor(posthog);
  const bundleMonitor = createBundleSizeMonitor(posthog);

  useEffect(() => {
    // Update stats periodically
    const updateStats = () => {
      const performanceStats = performanceMonitor.getPerformanceStats();
      const bundleMetrics = bundleMonitor.getBundleMetrics();
      const bundleAnalysis = bundleMonitor.analyzeBundleImpact();
      
      setStats({
        responseTime: {
          average: performanceStats.averageResponseTime,
          p95: performanceStats.averageResponseTime * 1.5, // Estimate
          category: categorizeResponseTime(performanceStats.averageResponseTime)
        },
        bundleSize: {
          total: (bundleMetrics.aiAssistantSize || 0) + (bundleMetrics.geminiSDKSize || 0),
          aiComponent: bundleMetrics.aiAssistantSize || 0,
          category: categorizeBundleSize((bundleMetrics.aiAssistantSize || 0) + (bundleMetrics.geminiSDKSize || 0))
        },
        successRate: performanceStats.successRate * 100,
        cacheHitRate: 85, // Mock data - would come from cache stats
        activeRequests: performanceStats.activeRequests
      });
      
      // Generate optimization suggestions
      const newSuggestions: OptimizationSuggestion[] = [];
      
      if (performanceStats.averageResponseTime > 3000) {
        newSuggestions.push({
          type: 'performance',
          priority: 'high',
          title: 'Optimize Response Time',
          description: 'Average response time is above 3 seconds. Consider implementing request caching or optimizing context processing.',
          estimatedImpact: '40% faster responses'
        });
      }
      
      if (bundleAnalysis.canLazyLoad) {
        newSuggestions.push({
          type: 'bundle',
          priority: 'medium',
          title: 'Implement Lazy Loading',
          description: 'AI components can be lazy loaded to reduce initial bundle size.',
          estimatedImpact: `${Math.round(bundleAnalysis.estimatedSavings)}KB savings`
        });
      }
      
      if (bundleAnalysis.canCodeSplit) {
        newSuggestions.push({
          type: 'bundle',
          priority: 'high',
          title: 'Code Splitting Opportunity',
          description: 'Large bundle detected. Consider splitting AI components into separate chunks.',
          estimatedImpact: `${Math.round(bundleAnalysis.estimatedSavings * 0.6)}KB initial load reduction`
        });
      }
      
      setSuggestions(newSuggestions);
    };

    updateStats();
    const interval = setInterval(updateStats, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [performanceMonitor, bundleMonitor]);

  // Show dashboard only in development or when explicitly enabled
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    const isEnabled = localStorage.getItem('ai-performance-dashboard') === 'true';
    setIsVisible(isDev || isEnabled);
  }, []);

  if (!isVisible) {
    return null;
  }

  const getStatusColor = (category: string) => {
    switch (category) {
      case 'excellent':
      case 'good':
      case 'small':
        return 'text-green-600';
      case 'acceptable':
      case 'medium':
        return 'text-yellow-600';
      case 'poor':
      case 'large':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (category: string) => {
    switch (category) {
      case 'excellent':
      case 'good':
      case 'small':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'acceptable':
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'poor':
      case 'large':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 z-50">
      <Card className="shadow-lg border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle className="text-sm">AI Performance</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
          <CardDescription className="text-xs">
            Real-time monitoring and optimization
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metrics" className="text-xs">Metrics</TabsTrigger>
              <TabsTrigger value="suggestions" className="text-xs">
                Suggestions
                {suggestions.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-xs">
                    {suggestions.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="metrics" className="space-y-3 mt-3">
              {/* Response Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Response Time</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(stats.responseTime.category)}
                    <span className={`text-xs ${getStatusColor(stats.responseTime.category)}`}>
                      {stats.responseTime.category}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Avg: {stats.responseTime.average.toFixed(0)}ms | P95: {stats.responseTime.p95.toFixed(0)}ms
                </div>
                <Progress 
                  value={Math.min((stats.responseTime.average / 5000) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* Bundle Size */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="text-sm font-medium">Bundle Size</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(stats.bundleSize.category)}
                    <span className={`text-xs ${getStatusColor(stats.bundleSize.category)}`}>
                      {stats.bundleSize.category}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Total: {stats.bundleSize.total.toFixed(0)}KB | AI: {stats.bundleSize.aiComponent.toFixed(0)}KB
                </div>
                <Progress 
                  value={Math.min((stats.bundleSize.total / 500) * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* Success Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <span className="text-xs font-medium">
                    {stats.successRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.successRate} className="h-2" />
              </div>

              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                  </div>
                  <span className="text-xs font-medium">
                    {stats.cacheHitRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={stats.cacheHitRate} className="h-2" />
              </div>

              {/* Active Requests */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm font-medium">Active Requests</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {stats.activeRequests}
                </Badge>
              </div>
            </TabsContent>
            
            <TabsContent value="suggestions" className="space-y-2 mt-3">
              {suggestions.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No optimization suggestions
                  </p>
                </div>
              ) : (
                suggestions.map((suggestion, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={getPriorityColor(suggestion.priority) as any}
                            className="text-xs"
                          >
                            {suggestion.priority}
                          </Badge>
                          <span className="text-sm font-medium">
                            {suggestion.title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600">
                            {suggestion.estimatedImpact}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function categorizeResponseTime(time: number): string {
  if (time < 500) return 'excellent';
  if (time < 1000) return 'good';
  if (time < 3000) return 'acceptable';
  return 'poor';
}

function categorizeBundleSize(size: number): string {
  if (size < 50) return 'small';
  if (size < 150) return 'medium';
  if (size < 300) return 'large';
  return 'very_large';
}