/**
 * Template Performance Benchmarking System
 * 
 * Provides comprehensive benchmarking and regression testing
 * for template system performance with automated reporting.
 */

import { getPerformanceMonitor } from './template-performance-monitor'
import { getErrorTracker } from './template-error-tracker'

// Benchmark types and interfaces
export interface BenchmarkSuite {
  name: string
  description: string
  tests: BenchmarkTest[]
  setup?: () => Promise<void>
  teardown?: () => Promise<void>
}

export interface BenchmarkTest {
  name: string
  description: string
  fn: () => Promise<void> | void
  iterations?: number
  timeout?: number
  warmup?: number
  expectedTime?: number // ms
  maxMemory?: number // MB
}

export interface BenchmarkResult {
  testName: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  memoryUsage: number
  memoryDelta: number
  passed: boolean
  error?: string
  metadata?: Record<string, any>
}

export interface BenchmarkReport {
  suiteName: string
  timestamp: number
  environment: {
    userAgent: string
    platform: string
    memory?: number
    cores?: number
  }
  results: BenchmarkResult[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    totalTime: number
    averageTime: number
    memoryUsage: number
  }
  regressions: RegressionAnalysis[]
}

export interface RegressionAnalysis {
  testName: string
  currentTime: number
  baselineTime: number
  regression: number // percentage
  severity: 'minor' | 'moderate' | 'severe'
}

// Benchmark runner class
export class TemplateBenchmarkRunner {
  private baselines: Map<string, BenchmarkResult> = new Map()
  private results: BenchmarkResult[] = []
  private regressionThreshold = 0.2 // 20% regression threshold

  constructor() {
    this.loadBaselines()
  }

  // Run a benchmark suite
  async runSuite(suite: BenchmarkSuite): Promise<BenchmarkReport> {
    console.log(`Running benchmark suite: ${suite.name}`)
    
    const startTime = Date.now()
    const results: BenchmarkResult[] = []
    
    try {
      // Setup
      if (suite.setup) {
        await suite.setup()
      }

      // Run tests
      for (const test of suite.tests) {
        const result = await this.runTest(test)
        results.push(result)
        
        // Store result for regression analysis
        this.results.push(result)
      }

      // Teardown
      if (suite.teardown) {
        await suite.teardown()
      }

    } catch (error) {
      console.error(`Benchmark suite failed: ${suite.name}`, error)
      throw error
    }

    const totalTime = Date.now() - startTime
    const report = this.generateReport(suite.name, results, totalTime)
    
    // Analyze regressions
    report.regressions = this.analyzeRegressions(results)
    
    // Save new baselines if all tests passed
    if (report.summary.failedTests === 0) {
      this.updateBaselines(results)
    }

    return report
  }

  // Run individual benchmark test
  private async runTest(test: BenchmarkTest): Promise<BenchmarkResult> {
    const iterations = test.iterations || 10
    const warmup = test.warmup || 3
    const timeout = test.timeout || 30000
    
    console.log(`Running test: ${test.name} (${iterations} iterations)`)
    
    const times: number[] = []
    let memoryBefore = 0
    let memoryAfter = 0
    let error: string | undefined

    try {
      // Get initial memory usage
      if ('memory' in performance) {
        memoryBefore = (performance as any).memory.usedJSHeapSize
      }

      // Warmup runs
      for (let i = 0; i < warmup; i++) {
        await this.runWithTimeout(test.fn, timeout)
      }

      // Actual benchmark runs
      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now()
        await this.runWithTimeout(test.fn, timeout)
        const endTime = performance.now()
        
        times.push(endTime - startTime)
      }

      // Get final memory usage
      if ('memory' in performance) {
        memoryAfter = (performance as any).memory.usedJSHeapSize
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error'
      console.error(`Test failed: ${test.name}`, err)
    }

    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = times.length > 0 ? totalTime / times.length : 0
    const minTime = times.length > 0 ? Math.min(...times) : 0
    const maxTime = times.length > 0 ? Math.max(...times) : 0
    const memoryUsage = memoryAfter / 1024 / 1024 // Convert to MB
    const memoryDelta = (memoryAfter - memoryBefore) / 1024 / 1024

    // Check if test passed
    const passed = !error && 
                  (!test.expectedTime || averageTime <= test.expectedTime) &&
                  (!test.maxMemory || memoryUsage <= test.maxMemory)

    return {
      testName: test.name,
      iterations: times.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      memoryUsage,
      memoryDelta,
      passed,
      error,
      metadata: {
        description: test.description,
        expectedTime: test.expectedTime,
        maxMemory: test.maxMemory
      }
    }
  }

  // Run function with timeout
  private async runWithTimeout(fn: () => Promise<void> | void, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`))
      }, timeout)

      Promise.resolve(fn()).then(
        () => {
          clearTimeout(timer)
          resolve()
        },
        (error) => {
          clearTimeout(timer)
          reject(error)
        }
      )
    })
  }

  // Generate benchmark report
  private generateReport(suiteName: string, results: BenchmarkResult[], totalTime: number): BenchmarkReport {
    const passedTests = results.filter(r => r.passed).length
    const failedTests = results.length - passedTests
    const averageTime = results.reduce((sum, r) => sum + r.averageTime, 0) / results.length
    const memoryUsage = Math.max(...results.map(r => r.memoryUsage))

    return {
      suiteName,
      timestamp: Date.now(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
        memory: 'memory' in performance ? (performance as any).memory.jsHeapSizeLimit / 1024 / 1024 : undefined,
        cores: typeof navigator !== 'undefined' ? (navigator as any).hardwareConcurrency : undefined
      },
      results,
      summary: {
        totalTests: results.length,
        passedTests,
        failedTests,
        totalTime,
        averageTime,
        memoryUsage
      },
      regressions: []
    }
  }

  // Analyze performance regressions
  private analyzeRegressions(results: BenchmarkResult[]): RegressionAnalysis[] {
    const regressions: RegressionAnalysis[] = []

    for (const result of results) {
      const baseline = this.baselines.get(result.testName)
      if (baseline && baseline.averageTime > 0) {
        const regression = (result.averageTime - baseline.averageTime) / baseline.averageTime
        
        if (regression > this.regressionThreshold) {
          let severity: 'minor' | 'moderate' | 'severe' = 'minor'
          if (regression > 0.5) severity = 'moderate'
          if (regression > 1.0) severity = 'severe'

          regressions.push({
            testName: result.testName,
            currentTime: result.averageTime,
            baselineTime: baseline.averageTime,
            regression: regression * 100,
            severity
          })
        }
      }
    }

    return regressions
  }

  // Load baseline results from storage
  private loadBaselines() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('template_benchmark_baselines')
        if (stored) {
          const baselines = JSON.parse(stored)
          this.baselines = new Map(Object.entries(baselines))
        }
      }
    } catch (error) {
      console.warn('Failed to load benchmark baselines:', error)
    }
  }

  // Update baseline results
  private updateBaselines(results: BenchmarkResult[]) {
    for (const result of results) {
      this.baselines.set(result.testName, result)
    }

    // Save to storage
    try {
      if (typeof localStorage !== 'undefined') {
        const baselinesObj = Object.fromEntries(this.baselines)
        localStorage.setItem('template_benchmark_baselines', JSON.stringify(baselinesObj))
      }
    } catch (error) {
      console.warn('Failed to save benchmark baselines:', error)
    }
  }

  // Set regression threshold
  setRegressionThreshold(threshold: number) {
    this.regressionThreshold = threshold
  }

  // Get historical results
  getHistoricalResults(): BenchmarkResult[] {
    return [...this.results]
  }

  // Clear baselines
  clearBaselines() {
    this.baselines.clear()
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('template_benchmark_baselines')
    }
  }
}

// Predefined benchmark suites
export const templateBenchmarkSuites: BenchmarkSuite[] = [
  {
    name: 'Template Content Parsing',
    description: 'Benchmark template content parsing performance',
    tests: [
      {
        name: 'Parse Simple Content',
        description: 'Parse basic paragraph content',
        fn: async () => {
          const { parseTemplateContent } = await import('./template-content-parser')
          const content = {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }
            ]
          }
          parseTemplateContent(content)
        },
        iterations: 100,
        expectedTime: 5 // 5ms
      },
      {
        name: 'Parse Complex Content',
        description: 'Parse content with multiple elements and variables',
        fn: async () => {
          const { parseTemplateContent } = await import('./template-content-parser')
          const content = {
            type: 'doc',
            content: [
              { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
              { type: 'paragraph', content: [
                { type: 'text', text: 'Hello ' },
                { type: 'mention', attrs: { id: 'tenant_name' } },
                { type: 'text', text: ', welcome!' }
              ]},
              { type: 'bulletList', content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 1' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item 2' }] }] }
              ]}
            ]
          }
          parseTemplateContent(content)
        },
        iterations: 50,
        expectedTime: 15 // 15ms
      },
      {
        name: 'Parse Large Content',
        description: 'Parse very large template content',
        fn: async () => {
          const { parseTemplateContent } = await import('./template-content-parser')
          
          // Generate large content
          const paragraphs = Array.from({ length: 100 }, (_, i) => ({
            type: 'paragraph',
            content: [{ type: 'text', text: `This is paragraph ${i + 1} with some content.` }]
          }))
          
          const content = {
            type: 'doc',
            content: paragraphs
          }
          
          parseTemplateContent(content)
        },
        iterations: 10,
        expectedTime: 50, // 50ms
        maxMemory: 10 // 10MB
      }
    ]
  },
  {
    name: 'Template Variable Extraction',
    description: 'Benchmark variable extraction performance',
    tests: [
      {
        name: 'Extract Variables from Simple Content',
        description: 'Extract variables from basic content',
        fn: async () => {
          const { extractVariablesFromContent } = await import('./template-variable-extraction')
          const content = {
            type: 'doc',
            content: [
              { type: 'paragraph', content: [
                { type: 'text', text: 'Hello ' },
                { type: 'mention', attrs: { id: 'tenant_name' } },
                { type: 'text', text: ' and ' },
                { type: 'mention', attrs: { id: 'property_address' } }
              ]}
            ]
          }
          extractVariablesFromContent(content)
        },
        iterations: 100,
        expectedTime: 3 // 3ms
      },
      {
        name: 'Extract Variables from Complex Content',
        description: 'Extract variables from content with many variables',
        fn: async () => {
          const { extractVariablesFromContent } = await import('./template-variable-extraction')
          
          // Generate content with many variables
          const mentions = Array.from({ length: 50 }, (_, i) => [
            { type: 'text', text: 'Variable ' },
            { type: 'mention', attrs: { id: `variable_${i}` } },
            { type: 'text', text: ' ' }
          ]).flat()
          
          const content = {
            type: 'doc',
            content: [{ type: 'paragraph', content: mentions }]
          }
          
          extractVariablesFromContent(content)
        },
        iterations: 20,
        expectedTime: 20 // 20ms
      }
    ]
  },
  {
    name: 'Template Validation',
    description: 'Benchmark template validation performance',
    tests: [
      {
        name: 'Validate Simple Template',
        description: 'Validate basic template structure',
        fn: async () => {
          const { validateTemplateContent } = await import('./template-validation')
          const template = {
            titel: 'Test Template',
            inhalt: {
              type: 'doc',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }]
            },
            kategorie: 'test',
            kontext_anforderungen: []
          }
          await validateTemplateContent(template)
        },
        iterations: 50,
        expectedTime: 10 // 10ms
      },
      {
        name: 'Validate Complex Template',
        description: 'Validate template with complex validation rules',
        fn: async () => {
          const { validateTemplateContent } = await import('./template-validation')
          const template = {
            titel: 'Complex Test Template',
            inhalt: {
              type: 'doc',
              content: Array.from({ length: 20 }, (_, i) => ({
                type: 'paragraph',
                content: [
                  { type: 'text', text: `Paragraph ${i + 1} with ` },
                  { type: 'mention', attrs: { id: `variable_${i}` } }
                ]
              }))
            },
            kategorie: 'test',
            kontext_anforderungen: Array.from({ length: 10 }, (_, i) => `variable_${i}`)
          }
          await validateTemplateContent(template)
        },
        iterations: 20,
        expectedTime: 30 // 30ms
      }
    ]
  }
]

// Global benchmark runner
let globalBenchmarkRunner: TemplateBenchmarkRunner | null = null

export function getBenchmarkRunner(): TemplateBenchmarkRunner {
  if (!globalBenchmarkRunner) {
    globalBenchmarkRunner = new TemplateBenchmarkRunner()
  }
  return globalBenchmarkRunner
}

// Convenience functions
export async function runTemplateBenchmarks(): Promise<BenchmarkReport[]> {
  const runner = getBenchmarkRunner()
  const reports: BenchmarkReport[] = []

  for (const suite of templateBenchmarkSuites) {
    try {
      const report = await runner.runSuite(suite)
      reports.push(report)
      
      // Log results
      console.log(`Benchmark Suite: ${report.suiteName}`)
      console.log(`Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`)
      console.log(`Average Time: ${report.summary.averageTime.toFixed(2)}ms`)
      console.log(`Memory Usage: ${report.summary.memoryUsage.toFixed(2)}MB`)
      
      if (report.regressions.length > 0) {
        console.warn(`Regressions detected: ${report.regressions.length}`)
        report.regressions.forEach(reg => {
          console.warn(`- ${reg.testName}: ${reg.regression.toFixed(1)}% slower (${reg.severity})`)
        })
      }
      
    } catch (error) {
      console.error(`Failed to run benchmark suite: ${suite.name}`, error)
    }
  }

  return reports
}

// Generate comprehensive benchmark report
export function generateBenchmarkReport(reports: BenchmarkReport[]): string {
  let report = '# Template Performance Benchmark Report\n\n'
  
  report += `Generated: ${new Date().toISOString()}\n\n`
  
  // Summary
  const totalTests = reports.reduce((sum, r) => sum + r.summary.totalTests, 0)
  const totalPassed = reports.reduce((sum, r) => sum + r.summary.passedTests, 0)
  const totalRegressions = reports.reduce((sum, r) => sum + r.regressions.length, 0)
  
  report += `## Summary\n`
  report += `- Total Tests: ${totalTests}\n`
  report += `- Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)\n`
  report += `- Regressions: ${totalRegressions}\n\n`
  
  // Individual suite results
  reports.forEach(suiteReport => {
    report += `## ${suiteReport.suiteName}\n\n`
    
    report += `### Results\n`
    suiteReport.results.forEach(result => {
      const status = result.passed ? '✅' : '❌'
      report += `- ${status} **${result.testName}**: ${result.averageTime.toFixed(2)}ms avg`
      if (result.error) {
        report += ` (Error: ${result.error})`
      }
      report += '\n'
    })
    report += '\n'
    
    if (suiteReport.regressions.length > 0) {
      report += `### Regressions\n`
      suiteReport.regressions.forEach(reg => {
        const icon = reg.severity === 'severe' ? '🔴' : reg.severity === 'moderate' ? '🟡' : '🟠'
        report += `- ${icon} **${reg.testName}**: ${reg.regression.toFixed(1)}% slower\n`
        report += `  - Current: ${reg.currentTime.toFixed(2)}ms\n`
        report += `  - Baseline: ${reg.baselineTime.toFixed(2)}ms\n`
      })
      report += '\n'
    }
  })
  
  return report
}

export { TemplateBenchmarkRunner }