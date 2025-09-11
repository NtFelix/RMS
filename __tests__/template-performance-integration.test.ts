/**
 * Template Performance Integration Tests
 * 
 * Comprehensive tests for the performance monitoring, optimization,
 * and benchmarking systems.
 */

import { 
  getPerformanceMonitor, 
  useTemplatePerformanceMonitor,
  TemplatePerformanceMonitor,
  DEFAULT_THRESHOLDS,
  PERFORMANCE_BUDGET
} from '@/lib/template-performance-monitor'

import { 
  getErrorTracker,
  trackTemplateError,
  TemplateErrorType,
  ErrorSeverity
} from '@/lib/template-error-tracker'

import { 
  getBenchmarkRunner,
  runTemplateBenchmarks,
  templateBenchmarkSuites,
  TemplateBenchmarkRunner
} from '@/lib/template-benchmark'

import { 
  LazyTemplateComponents,
  bundleAnalyzer,
  resourcePreloader,
  initializeBundleOptimizations
} from '@/lib/template-bundle-optimizer'

import { renderHook, act } from '@testing-library/react'

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
  }
}

// Mock window and performance
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
})

// Mock window object
;(global as any).window = {
  performance: mockPerformance,
  requestIdleCallback: jest.fn((cb) => setTimeout(cb, 0)),
  PerformanceObserver: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
  })),
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  navigator: {
    userAgent: 'Test Browser',
    platform: 'Test Platform',
    onLine: true
  }
}

// Mock document for DOM operations
;(global as any).document = {
  createElement: jest.fn(() => ({
    rel: '',
    href: '',
    as: '',
    crossOrigin: ''
  })),
  head: {
    appendChild: jest.fn()
  }
}

describe('Template Performance Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPerformance.now.mockReturnValue(Date.now())
    
    // Enable performance monitoring for tests
    process.env.NODE_ENV = 'development'
    
    // Reset global monitor instance
    const monitor = getPerformanceMonitor()
    monitor['metrics'] = []
    monitor['isEnabled'] = true
  })

  describe('Performance Monitor', () => {
    test('should initialize performance monitor correctly', () => {
      const monitor = getPerformanceMonitor()
      expect(monitor).toBeInstanceOf(TemplatePerformanceMonitor)
    })

    test('should record performance metrics', () => {
      const monitor = new TemplatePerformanceMonitor({ render: 16, parse: 100, save: 1000, load: 500, interaction: 100, memory: 50 })
      
      monitor.recordMetric('render', 25, { component: 'TestComponent' })
      monitor.recordMetric('parse', 50, { contentSize: 1000 })
      
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBeGreaterThanOrEqual(2)
      
      const renderMetric = metrics.find(m => m.category === 'render' && m.value === 25)
      const parseMetric = metrics.find(m => m.category === 'parse' && m.value === 50)
      
      expect(renderMetric).toBeDefined()
      expect(parseMetric).toBeDefined()
      expect(renderMetric?.metadata?.component).toBe('TestComponent')
      expect(parseMetric?.metadata?.contentSize).toBe(1000)
    })

    test('should generate performance report', () => {
      const monitor = new TemplatePerformanceMonitor({ render: 16, parse: 100, save: 1000, load: 500, interaction: 100, memory: 50 })
      
      // Add some test metrics
      monitor.recordMetric('render', 10)
      monitor.recordMetric('render', 20)
      monitor.recordMetric('parse', 30)
      monitor.recordMetric('memory', 40)
      
      const report = monitor.getPerformanceReport()
      
      expect(report.summary).toHaveProperty('render')
      expect(report.summary).toHaveProperty('parse')
      expect(report.summary).toHaveProperty('memory')
      expect(report.budget).toBeInstanceOf(Array)
      expect(typeof report.alerts).toBe('number')
    })

    test('should handle performance thresholds', () => {
      const monitor = new TemplatePerformanceMonitor({ render: 16, parse: 100, save: 1000, load: 500, interaction: 100, memory: 50 })
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      // Record metric that exceeds threshold
      monitor.recordMetric('render', 50) // Exceeds 16ms threshold
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance threshold exceeded'),
        expect.any(Object)
      )
      
      consoleSpy.mockRestore()
    })

    test('should measure async operations', async () => {
      const monitor = new TemplatePerformanceMonitor({ render: 16, parse: 100, save: 1000, load: 500, interaction: 100, memory: 50 })
      
      const testOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'result'
      }
      
      const result = await monitor.measureAsync('testOperation', testOperation)
      
      expect(result).toBe('result')
      const metrics = monitor.getMetrics('interaction')
      expect(metrics.length).toBeGreaterThanOrEqual(1)
      
      const operationMetric = metrics.find(m => m.metadata?.operation === 'testOperation')
      expect(operationMetric).toBeDefined()
      expect(operationMetric?.metadata?.success).toBe(true)
    })

    test('should handle profiling', () => {
      const monitor = new TemplatePerformanceMonitor({ render: 16, parse: 100, save: 1000, load: 500, interaction: 100, memory: 50 })
      
      const stopProfiling = monitor.startProfiling('testProfile')
      
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random()
      }
      
      stopProfiling()
      
      const metrics = monitor.getMetrics('interaction')
      expect(metrics.length).toBeGreaterThanOrEqual(1)
      
      const profileMetric = metrics.find(m => m.metadata?.profileName === 'testProfile')
      expect(profileMetric).toBeDefined()
    })
  })

  describe('Performance Monitor Hook', () => {
    test('should provide performance monitoring functionality', () => {
      const { result } = renderHook(() => useTemplatePerformanceMonitor())
      
      expect(result.current.recordMetric).toBeInstanceOf(Function)
      expect(result.current.startProfiling).toBeInstanceOf(Function)
      expect(result.current.measureAsync).toBeInstanceOf(Function)
      expect(result.current.getReport).toBeInstanceOf(Function)
      expect(result.current.metrics).toBeInstanceOf(Array)
    })

    test('should record metrics through hook', () => {
      const { result } = renderHook(() => useTemplatePerformanceMonitor())
      
      act(() => {
        result.current.recordMetric('render', 15, { test: true })
      })
      
      expect(result.current.metrics.length).toBeGreaterThan(0)
      const lastMetric = result.current.metrics[result.current.metrics.length - 1]
      expect(lastMetric.category).toBe('render')
      expect(lastMetric.value).toBe(15)
    })
  })

  describe('Error Tracker', () => {
    test('should track template errors', async () => {
      const error = await trackTemplateError(
        TemplateErrorType.PARSE_ERROR,
        'Test parse error',
        {
          component: 'TestComponent',
          severity: ErrorSeverity.HIGH
        }
      )
      
      expect(error.type).toBe(TemplateErrorType.PARSE_ERROR)
      expect(error.message).toBe('Test parse error')
      expect(error.severity).toBe(ErrorSeverity.HIGH)
      expect(error.component).toBe('TestComponent')
    })

    test('should attempt error recovery', async () => {
      const error = await trackTemplateError(
        TemplateErrorType.PARSE_ERROR,
        'Recoverable parse error',
        {
          metadata: { content: 'test content' }
        }
      )
      
      // Parse errors should be recoverable
      expect(error.recoverable).toBe(true)
      expect(error.recovered).toBe(true)
    })

    test('should generate error statistics', async () => {
      const tracker = getErrorTracker()
      
      // Track multiple errors
      await trackTemplateError(TemplateErrorType.PARSE_ERROR, 'Error 1')
      await trackTemplateError(TemplateErrorType.SAVE_ERROR, 'Error 2')
      await trackTemplateError(TemplateErrorType.PARSE_ERROR, 'Error 3')
      
      const stats = tracker.getErrorStats()
      
      expect(stats.total).toBeGreaterThanOrEqual(3)
      expect(stats.byType[TemplateErrorType.PARSE_ERROR]).toBeGreaterThanOrEqual(2)
      expect(stats.byType[TemplateErrorType.SAVE_ERROR]).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Benchmark Runner', () => {
    test('should initialize benchmark runner', () => {
      const runner = getBenchmarkRunner()
      expect(runner).toBeInstanceOf(TemplateBenchmarkRunner)
    })

    test('should have predefined benchmark suites', () => {
      expect(templateBenchmarkSuites).toBeInstanceOf(Array)
      expect(templateBenchmarkSuites.length).toBeGreaterThan(0)
      
      const firstSuite = templateBenchmarkSuites[0]
      expect(firstSuite).toHaveProperty('name')
      expect(firstSuite).toHaveProperty('description')
      expect(firstSuite).toHaveProperty('tests')
      expect(firstSuite.tests).toBeInstanceOf(Array)
    })

    test('should run individual benchmark test', async () => {
      const runner = getBenchmarkRunner()
      
      const testSuite = {
        name: 'Test Suite',
        description: 'Test benchmark suite',
        tests: [
          {
            name: 'Simple Test',
            description: 'A simple test',
            fn: () => {
              // Simulate some work
              for (let i = 0; i < 100; i++) {
                Math.random()
              }
            },
            iterations: 5,
            expectedTime: 10
          }
        ]
      }
      
      const report = await runner.runSuite(testSuite)
      
      expect(report.suiteName).toBe('Test Suite')
      expect(report.results).toHaveLength(1)
      expect(report.results[0].testName).toBe('Simple Test')
      expect(report.results[0].passed).toBe(true)
      expect(report.summary.totalTests).toBe(1)
      expect(report.summary.passedTests).toBe(1)
    })

    test('should detect performance regressions', async () => {
      const runner = getBenchmarkRunner()
      
      // Set a baseline
      const baselineResult = {
        testName: 'Regression Test',
        averageTime: 10,
        iterations: 5,
        totalTime: 50,
        minTime: 8,
        maxTime: 12,
        memoryUsage: 20,
        memoryDelta: 1,
        passed: true
      }
      
      runner['baselines'].set('Regression Test', baselineResult)
      
      // Create a slower test
      const testSuite = {
        name: 'Regression Suite',
        description: 'Test for regressions',
        tests: [
          {
            name: 'Regression Test',
            description: 'A test that should show regression',
            fn: () => {
              // Simulate slower work
              for (let i = 0; i < 1000; i++) {
                Math.random()
              }
            },
            iterations: 3
          }
        ]
      }
      
      const report = await runner.runSuite(testSuite)
      
      // Should detect regression if the test is significantly slower
      if (report.results[0].averageTime > baselineResult.averageTime * 1.2) {
        expect(report.regressions.length).toBeGreaterThan(0)
        expect(report.regressions[0].testName).toBe('Regression Test')
      }
    })
  })

  describe('Bundle Optimizer', () => {
    test('should provide lazy template components', () => {
      expect(LazyTemplateComponents).toHaveProperty('TiptapTemplateEditor')
      expect(LazyTemplateComponents).toHaveProperty('EnhancedToolbar')
      expect(LazyTemplateComponents).toHaveProperty('BubbleMenu')
      expect(LazyTemplateComponents).toHaveProperty('TemplateEditorModal')
    })

    test('should analyze bundle composition', () => {
      const analysis = bundleAnalyzer.analyzeBundleComposition()
      
      expect(analysis).toHaveProperty('totalSize')
      expect(analysis).toHaveProperty('gzippedSize')
      expect(analysis).toHaveProperty('components')
      expect(analysis).toHaveProperty('dependencies')
      expect(analysis).toHaveProperty('recommendations')
      
      expect(analysis.components).toBeInstanceOf(Array)
      expect(analysis.dependencies).toBeInstanceOf(Array)
      expect(analysis.recommendations).toBeInstanceOf(Array)
    })

    test('should generate optimization report', () => {
      const report = bundleAnalyzer.generateOptimizationReport()
      
      expect(typeof report).toBe('string')
      expect(report).toContain('# Template Bundle Optimization Report')
      expect(report).toContain('## Bundle Size Analysis')
      expect(report).toContain('## Component Analysis')
      expect(report).toContain('## Dependencies')
      expect(report).toContain('## Optimization Recommendations')
    })

    test('should handle resource preloading', () => {
      const preloadSpy = jest.spyOn(document, 'createElement').mockImplementation(() => ({
        rel: '',
        href: '',
        as: '',
        crossOrigin: ''
      } as any))
      
      const appendSpy = jest.spyOn(document.head, 'appendChild').mockImplementation()
      
      resourcePreloader.preloadResource('/test-resource.js', 'script')
      
      expect(preloadSpy).toHaveBeenCalledWith('link')
      expect(appendSpy).toHaveBeenCalled()
      
      preloadSpy.mockRestore()
      appendSpy.mockRestore()
    })

    test('should initialize bundle optimizations', () => {
      // Mock the function directly on the window object
      const mockRequestIdleCallback = jest.fn((cb) => setTimeout(cb, 0))
      ;(global.window as any).requestIdleCallback = mockRequestIdleCallback
      
      initializeBundleOptimizations()
      
      expect(mockRequestIdleCallback).toHaveBeenCalled()
    })
  })

  describe('Integration Scenarios', () => {
    test('should handle complete performance monitoring workflow', async () => {
      const monitor = getPerformanceMonitor()
      
      // Start profiling
      const stopProfiling = monitor.startProfiling('complete-workflow')
      
      // Record various metrics
      monitor.recordMetric('parse', 45, { contentSize: 2000 })
      monitor.recordMetric('render', 12, { component: 'Editor' })
      monitor.recordMetric('save', 200, { templateId: 'test-123' })
      
      // Measure async operation
      await monitor.measureAsync('load-template', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
      })
      
      // Stop profiling
      stopProfiling()
      
      // Generate report
      const report = monitor.getPerformanceReport()
      
      expect(report.summary).toHaveProperty('parse')
      expect(report.summary).toHaveProperty('render')
      expect(report.summary).toHaveProperty('save')
      expect(report.summary).toHaveProperty('interaction')
      
      // Check that metrics were recorded
      const metrics = monitor.getMetrics()
      expect(metrics.length).toBeGreaterThanOrEqual(4) // 3 direct + 2 from measureAsync and profiling
    })

    test('should handle error tracking with performance impact', async () => {
      const monitor = getPerformanceMonitor()
      const initialMetrics = monitor.getMetrics().length
      
      // Track an error (should also record performance impact)
      await trackTemplateError(
        TemplateErrorType.SAVE_ERROR,
        'Performance impacting error',
        {
          component: 'TemplateEditor',
          operation: 'save',
          severity: ErrorSeverity.HIGH
        }
      )
      
      // Check that performance impact was recorded
      const finalMetrics = monitor.getMetrics()
      expect(finalMetrics.length).toBeGreaterThan(initialMetrics)
      
      const errorImpactMetric = finalMetrics.find(m => 
        m.metadata?.type === 'error_impact'
      )
      expect(errorImpactMetric).toBeDefined()
      expect(errorImpactMetric?.metadata?.errorType).toBe(TemplateErrorType.SAVE_ERROR)
    })

    test('should handle benchmark with performance monitoring', async () => {
      const monitor = getPerformanceMonitor()
      const runner = getBenchmarkRunner()
      
      const initialMetrics = monitor.getMetrics().length
      
      // Run a simple benchmark
      const testSuite = {
        name: 'Monitored Test Suite',
        description: 'Test suite with performance monitoring',
        tests: [
          {
            name: 'Monitored Test',
            description: 'A test that records performance metrics',
            fn: () => {
              // Record a metric during the test
              monitor.recordMetric('interaction', 25, { 
                test: 'benchmark',
                operation: 'test-operation'
              })
            },
            iterations: 3
          }
        ]
      }
      
      const report = await runner.runSuite(testSuite)
      
      expect(report.results[0].passed).toBe(true)
      
      // Check that metrics were recorded during benchmarking
      const finalMetrics = monitor.getMetrics()
      expect(finalMetrics.length).toBeGreaterThan(initialMetrics)
    })
  })

  describe('Performance Thresholds and Budgets', () => {
    test('should have defined performance thresholds', () => {
      expect(DEFAULT_THRESHOLDS).toHaveProperty('render')
      expect(DEFAULT_THRESHOLDS).toHaveProperty('parse')
      expect(DEFAULT_THRESHOLDS).toHaveProperty('save')
      expect(DEFAULT_THRESHOLDS).toHaveProperty('load')
      expect(DEFAULT_THRESHOLDS).toHaveProperty('interaction')
      expect(DEFAULT_THRESHOLDS).toHaveProperty('memory')
      
      expect(DEFAULT_THRESHOLDS.render).toBe(16) // 60fps
      expect(DEFAULT_THRESHOLDS.memory).toBe(50) // 50MB
    })

    test('should have defined performance budget', () => {
      expect(PERFORMANCE_BUDGET).toHaveProperty('bundleSize')
      expect(PERFORMANCE_BUDGET).toHaveProperty('initialLoad')
      expect(PERFORMANCE_BUDGET).toHaveProperty('firstContentfulPaint')
      expect(PERFORMANCE_BUDGET).toHaveProperty('largestContentfulPaint')
      expect(PERFORMANCE_BUDGET).toHaveProperty('cumulativeLayoutShift')
      expect(PERFORMANCE_BUDGET).toHaveProperty('firstInputDelay')
      
      expect(PERFORMANCE_BUDGET.bundleSize).toBe(500) // 500KB
      expect(PERFORMANCE_BUDGET.initialLoad).toBe(2000) // 2 seconds
    })

    test('should validate performance against budget', () => {
      const monitor = getPerformanceMonitor()
      
      // Add metrics that should pass budget
      monitor.recordMetric('load', 1500) // Under 2000ms budget
      monitor.recordMetric('render', 1000) // Under 1500ms budget
      monitor.recordMetric('memory', 30) // Under 500KB budget (treating as MB for this test)
      
      const report = monitor.getPerformanceReport()
      
      expect(report.budget).toBeInstanceOf(Array)
      expect(report.budget.length).toBeGreaterThan(0)
      
      // Check that budget items have the expected structure
      report.budget.forEach(item => {
        expect(item).toHaveProperty('metric')
        expect(item).toHaveProperty('current')
        expect(item).toHaveProperty('budget')
        expect(item).toHaveProperty('status')
        expect(['pass', 'fail']).toContain(item.status)
      })
    })
  })
})

// Cleanup after tests
afterAll(() => {
  // Clean up any global state
  jest.restoreAllMocks()
})