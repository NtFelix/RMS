/**
 * Performance Monitoring Page
 * 
 * Provides access to the performance monitoring dashboard for tracking
 * betriebskosten optimization performance metrics.
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 10
 */

import { PerformanceMonitoringDashboard } from '@/components/performance-monitoring-dashboard';

export default function PerformancePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Performance Monitoring</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and analyze the performance of betriebskosten operations and database functions.
        </p>
      </div>
      
      <PerformanceMonitoringDashboard />
    </div>
  );
}