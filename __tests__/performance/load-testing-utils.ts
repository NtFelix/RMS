/**
 * Load Testing Utilities for Betriebskosten Performance Testing
 * 
 * Provides utilities for simulating high-load scenarios and measuring
 * performance under stress conditions.
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 10
 */

import { createClient } from '@/utils/supabase/client';
import { safeRpcCall, PerformanceMetrics } from '@/lib/error-handling';

export interface LoadTestConfig {
  concurrentUsers: number;
  operationsPerUser: number;
  rampUpTimeMs: number;
  testDurationMs: number;
}

export interface LoadTestResult {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  operationsPerSecond: number;
  errorRate: number;
  performanceMetrics: PerformanceMetrics[];
}

export class LoadTester {
  private supabase = createClient();
  private results: PerformanceMetrics[] = [];

  /**
   * Simulates concurrent users performing database operations
   */
  async runLoadTest(
    functionName: string,
    params: Record<string, any>,
    config: LoadTestConfig
  ): Promise<LoadTestResult> {
    console.log(`🚀 Starting load test: ${functionName}`);
    console.log(`   Concurrent users: ${config.concurrentUsers}`);
    console.log(`   Operations per user: ${config.operationsPerUser}`);
    console.log(`   Total operations: ${config.concurrentUsers * config.operationsPerUser}`);

    this.results = [];
    const startTime = Date.now();

    // Create promises for concurrent users
    const userPromises: Promise<void>[] = [];

    for (let userId = 0; userId < config.concurrentUsers; userId++) {
      const userPromise = this.simulateUser(
        functionName,
        { ...params, user_id: `load-test-user-${userId}` },
        config.operationsPerUser,
        userId * (config.rampUpTimeMs / config.concurrentUsers) // Stagger user start times
      );
      userPromises.push(userPromise);
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    return this.calculateResults(totalDuration);
  }

  /**
   * Simulates a single user performing multiple operations
   */
  private async simulateUser(
    functionName: string,
    params: Record<string, any>,
    operationCount: number,
    delayMs: number = 0
  ): Promise<void> {
    // Wait for ramp-up delay
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    const operations: Promise<void>[] = [];

    for (let i = 0; i < operationCount; i++) {
      const operation = this.performOperation(functionName, params, i);
      operations.push(operation);

      // Add small delay between operations to simulate realistic usage
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await Promise.all(operations);
  }

  /**
   * Performs a single database operation and records metrics
   */
  private async performOperation(
    functionName: string,
    params: Record<string, any>,
    operationIndex: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const result = await safeRpcCall(
        this.supabase,
        functionName,
        { ...params, operation_index: operationIndex }
      );

      const metric: PerformanceMetrics = {
        functionName,
        executionTime: Date.now() - startTime,
        success: result.success,
        timestamp: new Date(),
        userId: params.user_id,
        parameters: params
      };

      this.results.push(metric);
    } catch (error) {
      const metric: PerformanceMetrics = {
        functionName,
        executionTime: Date.now() - startTime,
        success: false,
        timestamp: new Date(),
        userId: params.user_id,
        parameters: params,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };

      this.results.push(metric);
    }
  }

  /**
   * Calculates load test results from collected metrics
   */
  private calculateResults(totalDurationMs: number): LoadTestResult {
    const totalOperations = this.results.length;
    const successfulOperations = this.results.filter(r => r.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const responseTimes = this.results.map(r => r.executionTime);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalOperations;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);

    const operationsPerSecond = (totalOperations / totalDurationMs) * 1000;
    const errorRate = failedOperations / totalOperations;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      operationsPerSecond,
      errorRate,
      performanceMetrics: this.results
    };
  }

  /**
   * Generates a detailed load test report
   */
  generateReport(result: LoadTestResult, functionName: string): string {
    const report = `
📊 LOAD TEST REPORT: ${functionName}
${'='.repeat(50)}

SUMMARY:
  Total Operations: ${result.totalOperations}
  Successful: ${result.successfulOperations} (${((result.successfulOperations / result.totalOperations) * 100).toFixed(1)}%)
  Failed: ${result.failedOperations} (${(result.errorRate * 100).toFixed(1)}%)
  
PERFORMANCE:
  Average Response Time: ${result.averageResponseTime.toFixed(2)}ms
  Min Response Time: ${result.minResponseTime}ms
  Max Response Time: ${result.maxResponseTime}ms
  Operations/Second: ${result.operationsPerSecond.toFixed(2)}
  
RESPONSE TIME DISTRIBUTION:
${this.generateResponseTimeDistribution(result.performanceMetrics)}

RECOMMENDATIONS:
${this.generateRecommendations(result)}
`;

    return report;
  }

  /**
   * Generates response time distribution analysis
   */
  private generateResponseTimeDistribution(metrics: PerformanceMetrics[]): string {
    const responseTimes = metrics.map(m => m.executionTime).sort((a, b) => a - b);
    const total = responseTimes.length;

    const percentiles = [50, 75, 90, 95, 99];
    let distribution = '';

    percentiles.forEach(p => {
      const index = Math.floor((p / 100) * total);
      const value = responseTimes[index] || 0;
      distribution += `  P${p}: ${value}ms\n`;
    });

    return distribution;
  }

  /**
   * Generates performance recommendations based on results
   */
  private generateRecommendations(result: LoadTestResult): string {
    const recommendations: string[] = [];

    if (result.errorRate > 0.05) { // > 5% error rate
      recommendations.push('• High error rate detected - investigate error handling and database capacity');
    }

    if (result.averageResponseTime > 3000) { // > 3s average
      recommendations.push('• Average response time is high - consider database optimization');
    }

    if (result.maxResponseTime > 10000) { // > 10s max
      recommendations.push('• Some operations are very slow - implement timeout handling');
    }

    if (result.operationsPerSecond < 1) { // < 1 op/s
      recommendations.push('• Low throughput detected - consider scaling database resources');
    }

    if (recommendations.length === 0) {
      recommendations.push('• Performance looks good! All metrics within acceptable ranges');
    }

    return recommendations.join('\n');
  }
}

/**
 * Predefined load test scenarios for different use cases
 */
export const LoadTestScenarios = {
  // Light load - normal usage
  LIGHT_LOAD: {
    concurrentUsers: 5,
    operationsPerUser: 10,
    rampUpTimeMs: 2000,
    testDurationMs: 30000
  } as LoadTestConfig,

  // Medium load - busy period
  MEDIUM_LOAD: {
    concurrentUsers: 15,
    operationsPerUser: 20,
    rampUpTimeMs: 5000,
    testDurationMs: 60000
  } as LoadTestConfig,

  // Heavy load - stress test
  HEAVY_LOAD: {
    concurrentUsers: 50,
    operationsPerUser: 30,
    rampUpTimeMs: 10000,
    testDurationMs: 120000
  } as LoadTestConfig,

  // Spike test - sudden load increase
  SPIKE_TEST: {
    concurrentUsers: 100,
    operationsPerUser: 5,
    rampUpTimeMs: 1000,
    testDurationMs: 30000
  } as LoadTestConfig
};

/**
 * Database function test data generators
 */
export const TestDataGenerators = {
  generateNebenkostenParams: (userId: string) => ({
    user_id: userId
  }),

  generateWasserzaehlerModalParams: (userId: string) => ({
    nebenkosten_id: `test-nebenkosten-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId
  }),

  generateAbrechnungModalParams: (userId: string) => ({
    nebenkosten_id: `test-nebenkosten-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId
  }),

  generateWasserzaehlerSaveParams: (userId: string, readingCount: number = 10) => ({
    readings: Array.from({ length: readingCount }, (_, i) => ({
      mieter_id: `test-tenant-${i}`,
      zaehlerstand: 1000 + i * 10,
      verbrauch: 50 + i,
      ablese_datum: '2024-12-01'
    })),
    nebenkosten_id: `test-nebenkosten-${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId
  })
};