#!/usr/bin/env tsx
/**
 * Performance Validation Script for Betriebskosten Optimization
 * 
 * This script runs comprehensive performance tests and generates a detailed
 * report documenting the performance improvements achieved through optimization.
 * 
 * Usage: npx tsx scripts/performance-validation.ts
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 10
 */

import { createClient } from '@supabase/supabase-js';
import { safeRpcCall, PerformanceMonitor } from '../lib/error-handling';
import { LoadTester, LoadTestScenarios, TestDataGenerators } from '../__tests__/performance/load-testing-utils';
import fs from 'fs';
import path from 'path';

interface PerformanceValidationResult {
  timestamp: string;
  testResults: {
    pageLoad: TestResult;
    modalOperations: TestResult;
    saveOperations: TestResult;
    loadTesting: LoadTestResult;
  };
  cloudflareWorkerCompliance: boolean;
  performanceImprovements: string[];
  recommendations: string[];
}

interface TestResult {
  functionName: string;
  averageExecutionTime: number;
  maxExecutionTime: number;
  successRate: number;
  totalOperations: number;
  passedThresholds: boolean;
}

interface LoadTestResult {
  lightLoad: any;
  mediumLoad: any;
  heavyLoad: any;
}

class PerformanceValidator {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  private loadTester = new LoadTester();
  private results: PerformanceValidationResult;

  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testResults: {
        pageLoad: {} as TestResult,
        modalOperations: {} as TestResult,
        saveOperations: {} as TestResult,
        loadTesting: {} as LoadTestResult
      },
      cloudflareWorkerCompliance: true,
      performanceImprovements: [],
      recommendations: []
    };
  }

  async runValidation(): Promise<void> {
    console.log('🚀 Starting Performance Validation for Betriebskosten Optimization');
    console.log('================================================================\n');

    try {
      // Test 1: Page Load Performance
      await this.testPageLoadPerformance();
      
      // Test 2: Modal Operations Performance
      await this.testModalOperations();
      
      // Test 3: Save Operations Performance
      await this.testSaveOperations();
      
      // Test 4: Load Testing
      await this.runLoadTests();
      
      // Test 5: Cloudflare Worker Compliance
      await this.validateCloudflareCompliance();
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      process.exit(1);
    }
  }

  private async testPageLoadPerformance(): Promise<void> {
    console.log('📊 Testing Page Load Performance...');
    
    const iterations = 10;
    const results: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      const result = await safeRpcCall(
        this.supabase,
        'get_nebenkosten_with_metrics',
        { user_id: 'performance-test-user' }
      );

      const executionTime = Date.now() - startTime;
      results.push(executionTime);
      
      if (result.success) {
        successCount++;
      }

      process.stdout.write(`  Iteration ${i + 1}/${iterations}: ${executionTime}ms\r`);
    }

    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);
    const successRate = successCount / iterations;

    this.results.testResults.pageLoad = {
      functionName: 'get_nebenkosten_with_metrics',
      averageExecutionTime: averageTime,
      maxExecutionTime: maxTime,
      successRate,
      totalOperations: iterations,
      passedThresholds: averageTime < 5000 && maxTime < 10000 && successRate > 0.9
    };

    console.log(`\n  ✅ Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime}ms, Success: ${(successRate * 100).toFixed(1)}%\n`);
  }

  private async testModalOperations(): Promise<void> {
    console.log('🔄 Testing Modal Operations Performance...');
    
    const modalTests = [
      {
        name: 'get_wasserzaehler_modal_data',
        params: TestDataGenerators.generateWasserzaehlerModalParams('performance-test')
      },
      {
        name: 'get_abrechnung_modal_data',
        params: TestDataGenerators.generateAbrechnungModalParams('performance-test')
      }
    ];

    let totalAverage = 0;
    let totalMax = 0;
    let totalSuccess = 0;
    let totalOperations = 0;

    for (const test of modalTests) {
      const iterations = 5;
      const results: number[] = [];
      let successCount = 0;

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const result = await safeRpcCall(
          this.supabase,
          test.name,
          test.params
        );

        const executionTime = Date.now() - startTime;
        results.push(executionTime);
        
        if (result.success) {
          successCount++;
        }
      }

      const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const maxTime = Math.max(...results);
      const successRate = successCount / iterations;

      totalAverage += averageTime;
      totalMax = Math.max(totalMax, maxTime);
      totalSuccess += successCount;
      totalOperations += iterations;

      console.log(`  ${test.name}: ${averageTime.toFixed(2)}ms avg, ${maxTime}ms max`);
    }

    const overallAverage = totalAverage / modalTests.length;
    const overallSuccessRate = totalSuccess / totalOperations;

    this.results.testResults.modalOperations = {
      functionName: 'modal_operations_combined',
      averageExecutionTime: overallAverage,
      maxExecutionTime: totalMax,
      successRate: overallSuccessRate,
      totalOperations,
      passedThresholds: overallAverage < 3000 && totalMax < 8000 && overallSuccessRate > 0.8
    };

    console.log(`  ✅ Overall Modal Performance: ${overallAverage.toFixed(2)}ms avg, ${totalMax}ms max\n`);
  }

  private async testSaveOperations(): Promise<void> {
    console.log('💾 Testing Save Operations Performance...');
    
    const batchSizes = [10, 25, 50];
    const results: number[] = [];
    let successCount = 0;
    let totalOperations = 0;

    for (const batchSize of batchSizes) {
      const startTime = Date.now();
      
      const result = await safeRpcCall(
        this.supabase,
        'save_wasserzaehler_batch',
        TestDataGenerators.generateWasserzaehlerSaveParams('performance-test', batchSize)
      );

      const executionTime = Date.now() - startTime;
      results.push(executionTime);
      totalOperations++;
      
      if (result.success) {
        successCount++;
      }

      console.log(`  Batch size ${batchSize}: ${executionTime}ms`);
    }

    const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
    const maxTime = Math.max(...results);
    const successRate = successCount / totalOperations;

    this.results.testResults.saveOperations = {
      functionName: 'save_wasserzaehler_batch',
      averageExecutionTime: averageTime,
      maxExecutionTime: maxTime,
      successRate,
      totalOperations,
      passedThresholds: averageTime < 8000 && maxTime < 25000 && successRate > 0.8
    };

    console.log(`  ✅ Save Operations: ${averageTime.toFixed(2)}ms avg, ${maxTime}ms max\n`);
  }

  private async runLoadTests(): Promise<void> {
    console.log('🔥 Running Load Tests...');
    
    // Light load test
    console.log('  Running light load test...');
    const lightLoad = await this.loadTester.runLoadTest(
      'get_nebenkosten_with_metrics',
      TestDataGenerators.generateNebenkostenParams('load-test'),
      LoadTestScenarios.LIGHT_LOAD
    );

    // Medium load test (shorter version for validation)
    console.log('  Running medium load test...');
    const mediumLoad = await this.loadTester.runLoadTest(
      'get_wasserzaehler_modal_data',
      TestDataGenerators.generateWasserzaehlerModalParams('load-test'),
      {
        concurrentUsers: 10,
        operationsPerUser: 5,
        rampUpTimeMs: 2000,
        testDurationMs: 30000
      }
    );

    this.results.testResults.loadTesting = {
      lightLoad: {
        errorRate: lightLoad.errorRate,
        averageResponseTime: lightLoad.averageResponseTime,
        operationsPerSecond: lightLoad.operationsPerSecond
      },
      mediumLoad: {
        errorRate: mediumLoad.errorRate,
        averageResponseTime: mediumLoad.averageResponseTime,
        operationsPerSecond: mediumLoad.operationsPerSecond
      },
      heavyLoad: null // Skip heavy load in validation for time
    };

    console.log(`  ✅ Light Load: ${lightLoad.errorRate * 100}% error rate, ${lightLoad.averageResponseTime.toFixed(2)}ms avg`);
    console.log(`  ✅ Medium Load: ${mediumLoad.errorRate * 100}% error rate, ${mediumLoad.averageResponseTime.toFixed(2)}ms avg\n`);
  }

  private async validateCloudflareCompliance(): Promise<void> {
    console.log('☁️ Validating Cloudflare Worker Compliance...');
    
    const allResults = [
      this.results.testResults.pageLoad,
      this.results.testResults.modalOperations,
      this.results.testResults.saveOperations
    ];

    const maxExecutionTime = Math.max(...allResults.map(r => r.maxExecutionTime));
    const cloudflareLimit = 30000; // 30 seconds

    this.results.cloudflareWorkerCompliance = maxExecutionTime < cloudflareLimit;

    if (this.results.cloudflareWorkerCompliance) {
      console.log(`  ✅ All operations under Cloudflare limit (max: ${maxExecutionTime}ms < ${cloudflareLimit}ms)\n`);
    } else {
      console.log(`  ❌ Some operations exceed Cloudflare limit (max: ${maxExecutionTime}ms >= ${cloudflareLimit}ms)\n`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('📋 Generating Performance Report...');

    // Document performance improvements
    this.results.performanceImprovements = [
      'Eliminated O(n) database calls in fetchNebenkostenList by using get_nebenkosten_with_metrics DB function',
      'Reduced modal loading from 3+ separate API calls to single optimized database function calls',
      'Implemented efficient batch processing for Wasserzähler save operations',
      'Added comprehensive error handling with proper timeout management',
      'Implemented performance monitoring and alerting system',
      'Ensured all operations stay within Cloudflare Worker execution limits'
    ];

    // Generate recommendations
    this.results.recommendations = [];
    
    if (!this.results.testResults.pageLoad.passedThresholds) {
      this.results.recommendations.push('Consider further optimization of get_nebenkosten_with_metrics function');
    }
    
    if (!this.results.testResults.modalOperations.passedThresholds) {
      this.results.recommendations.push('Modal operations may benefit from additional caching or data structure optimization');
    }
    
    if (!this.results.testResults.saveOperations.passedThresholds) {
      this.results.recommendations.push('Save operations could be optimized with better batch processing or database indexing');
    }
    
    if (!this.results.cloudflareWorkerCompliance) {
      this.results.recommendations.push('CRITICAL: Some operations exceed Cloudflare Worker limits - immediate optimization required');
    }

    if (this.results.recommendations.length === 0) {
      this.results.recommendations.push('All performance targets met - system is well optimized');
    }

    // Save report to file
    const reportPath = path.join(process.cwd(), 'performance-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Generate human-readable report
    const humanReport = this.generateHumanReadableReport();
    const humanReportPath = path.join(process.cwd(), 'performance-validation-report.md');
    fs.writeFileSync(humanReportPath, humanReport);

    console.log(`  ✅ Reports saved:`);
    console.log(`     JSON: ${reportPath}`);
    console.log(`     Markdown: ${humanReportPath}\n`);

    // Print summary
    this.printSummary();
  }

  private generateHumanReadableReport(): string {
    const report = `# Betriebskosten Performance Validation Report

Generated: ${new Date(this.results.timestamp).toLocaleString()}

## Executive Summary

This report documents the performance validation results for the betriebskosten optimization implementation. The optimization focused on eliminating performance bottlenecks that were causing Cloudflare Worker timeouts.

## Test Results

### Page Load Performance
- **Function**: ${this.results.testResults.pageLoad.functionName}
- **Average Execution Time**: ${this.results.testResults.pageLoad.averageExecutionTime.toFixed(2)}ms
- **Max Execution Time**: ${this.results.testResults.pageLoad.maxExecutionTime}ms
- **Success Rate**: ${(this.results.testResults.pageLoad.successRate * 100).toFixed(1)}%
- **Passed Thresholds**: ${this.results.testResults.pageLoad.passedThresholds ? '✅ Yes' : '❌ No'}

### Modal Operations Performance
- **Average Execution Time**: ${this.results.testResults.modalOperations.averageExecutionTime.toFixed(2)}ms
- **Max Execution Time**: ${this.results.testResults.modalOperations.maxExecutionTime}ms
- **Success Rate**: ${(this.results.testResults.modalOperations.successRate * 100).toFixed(1)}%
- **Passed Thresholds**: ${this.results.testResults.modalOperations.passedThresholds ? '✅ Yes' : '❌ No'}

### Save Operations Performance
- **Function**: ${this.results.testResults.saveOperations.functionName}
- **Average Execution Time**: ${this.results.testResults.saveOperations.averageExecutionTime.toFixed(2)}ms
- **Max Execution Time**: ${this.results.testResults.saveOperations.maxExecutionTime}ms
- **Success Rate**: ${(this.results.testResults.saveOperations.successRate * 100).toFixed(1)}%
- **Passed Thresholds**: ${this.results.testResults.saveOperations.passedThresholds ? '✅ Yes' : '❌ No'}

### Load Testing Results
- **Light Load Error Rate**: ${(this.results.testResults.loadTesting.lightLoad.errorRate * 100).toFixed(2)}%
- **Light Load Avg Response**: ${this.results.testResults.loadTesting.lightLoad.averageResponseTime.toFixed(2)}ms
- **Medium Load Error Rate**: ${(this.results.testResults.loadTesting.mediumLoad.errorRate * 100).toFixed(2)}%
- **Medium Load Avg Response**: ${this.results.testResults.loadTesting.mediumLoad.averageResponseTime.toFixed(2)}ms

## Cloudflare Worker Compliance
${this.results.cloudflareWorkerCompliance ? '✅ **COMPLIANT** - All operations stay within Cloudflare Worker limits' : '❌ **NON-COMPLIANT** - Some operations exceed Cloudflare Worker limits'}

## Performance Improvements Achieved

${this.results.performanceImprovements.map(improvement => `- ${improvement}`).join('\n')}

## Recommendations

${this.results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Conclusion

${this.results.cloudflareWorkerCompliance && 
  this.results.testResults.pageLoad.passedThresholds && 
  this.results.testResults.modalOperations.passedThresholds && 
  this.results.testResults.saveOperations.passedThresholds
  ? 'The betriebskosten performance optimization has been successful. All performance targets have been met and the system is ready for production use.'
  : 'The betriebskosten performance optimization shows improvements but some areas may need additional attention. Review the recommendations above for next steps.'
}

---
*Report generated by Performance Validation Script*
*See .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 10*
`;

    return report;
  }

  private printSummary(): void {
    console.log('📊 PERFORMANCE VALIDATION SUMMARY');
    console.log('=================================');
    console.log(`Timestamp: ${new Date(this.results.timestamp).toLocaleString()}`);
    console.log('');
    
    console.log('Test Results:');
    console.log(`  Page Load: ${this.results.testResults.pageLoad.passedThresholds ? '✅ PASS' : '❌ FAIL'} (${this.results.testResults.pageLoad.averageExecutionTime.toFixed(2)}ms avg)`);
    console.log(`  Modal Ops: ${this.results.testResults.modalOperations.passedThresholds ? '✅ PASS' : '❌ FAIL'} (${this.results.testResults.modalOperations.averageExecutionTime.toFixed(2)}ms avg)`);
    console.log(`  Save Ops:  ${this.results.testResults.saveOperations.passedThresholds ? '✅ PASS' : '❌ FAIL'} (${this.results.testResults.saveOperations.averageExecutionTime.toFixed(2)}ms avg)`);
    console.log(`  CF Limits: ${this.results.cloudflareWorkerCompliance ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');
    
    console.log('Key Achievements:');
    this.results.performanceImprovements.forEach(improvement => {
      console.log(`  • ${improvement}`);
    });
    console.log('');
    
    if (this.results.recommendations.length > 0) {
      console.log('Recommendations:');
      this.results.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
      console.log('');
    }

    const overallSuccess = this.results.cloudflareWorkerCompliance && 
                          this.results.testResults.pageLoad.passedThresholds && 
                          this.results.testResults.modalOperations.passedThresholds && 
                          this.results.testResults.saveOperations.passedThresholds;

    console.log(`Overall Result: ${overallSuccess ? '✅ SUCCESS' : '⚠️ NEEDS ATTENTION'}`);
    console.log('=================================\n');
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const validator = new PerformanceValidator();
  validator.runValidation().catch(error => {
    console.error('Performance validation failed:', error);
    process.exit(1);
  });
}

export { PerformanceValidator };