/**
 * Tests for AI Performance Monitoring
 */

import { AIPerformanceMonitor, createAIPerformanceMonitor } from '@/lib/ai-performance-monitor';
import { BundleSizeMonitor, createBundleSizeMonitor } from '@/lib/bundle-size-monitor';

// Mock PostHog
const mockPostHog = {
  capture: jest.fn(),
  has_opted_in_capturing: jest.fn(() => true)
};

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024  // 20MB
  }
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true
});

describe('AIPerformanceMonitor', () => {
  let monitor: AIPerformanceMonitor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(1000);
    monitor = createAIPerformanceMonitor(mockPostHog as any);
  });

  describe('Request Tracking', () => {
    it('should start and complete request tracking', () => {
      const sessionId = 'test-session';
      const requestData = {
        message: 'test message',
        contextSize: 1000,
        cacheHit: false
      };

      // Start request
      monitor.startRequest(sessionId, requestData);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_started', 
        expect.objectContaining({
          session_id: sessionId,
          request_size_bytes: expect.any(Number),
          context_size_bytes: 1000,
          cache_hit: false
        })
      );

      // Complete request
      mockPerformance.now.mockReturnValue(2000); // 1 second later
      const metrics = monitor.completeRequest(sessionId, true);

      expect(metrics).toBeDefined();
      expect(metrics?.responseTime).toBe(1000);
      expect(metrics?.errorOccurred).toBe(false);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_completed',
        expect.objectContaining({
          session_id: sessionId,
          success: true,
          response_time_ms: 1000,
          performance_category: 'acceptable' // 1000ms is acceptable, not good
        })
      );
    });

    it('should track streaming metrics', () => {
      const sessionId = 'test-session';
      
      monitor.startRequest(sessionId, { message: 'test', cacheHit: false });
      
      // Track streaming start
      mockPerformance.now.mockReturnValue(1100);
      monitor.trackStreamingStart(sessionId);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_streaming_started',
        expect.objectContaining({
          session_id: sessionId,
          network_latency_ms: 100
        })
      );

      // Track first chunk
      mockPerformance.now.mockReturnValue(1200);
      monitor.trackFirstChunk(sessionId);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_first_chunk_received',
        expect.objectContaining({
          session_id: sessionId,
          time_to_first_chunk_ms: 100
        })
      );

      // Track chunks
      monitor.trackChunk(sessionId, 50);
      monitor.trackChunk(sessionId, 75);

      // Complete request
      mockPerformance.now.mockReturnValue(2000);
      const metrics = monitor.completeRequest(sessionId, true);

      expect(metrics?.chunkCount).toBe(2);
      expect(metrics?.responseSize).toBe(125);
    });

    it('should track errors properly', () => {
      const sessionId = 'test-session';
      
      monitor.startRequest(sessionId, { message: 'test', cacheHit: false });
      
      const error = {
        type: 'network_error',
        message: 'Connection failed',
        retryable: true
      };
      
      monitor.trackError(sessionId, error);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_error',
        expect.objectContaining({
          session_id: sessionId,
          error_type: 'network_error',
          error_message: 'Connection failed',
          retryable: true
        })
      );

      const metrics = monitor.completeRequest(sessionId, false);
      expect(metrics?.errorOccurred).toBe(true);
      expect(metrics?.errorType).toBe('network_error');
    });

    it('should track retry attempts', () => {
      const sessionId = 'test-session';
      
      // Clear previous calls
      jest.clearAllMocks();
      
      // Start a request first so the session exists
      monitor.startRequest(sessionId, { message: 'test', cacheHit: false });
      
      monitor.trackRetry(sessionId, 2);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_retry',
        expect.objectContaining({
          session_id: sessionId,
          retry_count: 2
        })
      );
    });
  });

  describe('Performance Categorization', () => {
    it('should categorize response times correctly', () => {
      const sessionId = 'test-session';
      
      // Test excellent performance (< 500ms)
      monitor.startRequest(sessionId, { message: 'test', cacheHit: false });
      mockPerformance.now.mockReturnValue(1400); // 400ms later
      monitor.completeRequest(sessionId, true);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_completed',
        expect.objectContaining({
          performance_category: 'excellent'
        })
      );

      // Test poor performance (> 10s)
      const sessionId2 = 'test-session-2';
      mockPerformance.now.mockReturnValue(2000);
      monitor.startRequest(sessionId2, { message: 'test', cacheHit: false });
      mockPerformance.now.mockReturnValue(13000); // 11s later
      monitor.completeRequest(sessionId2, true);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_request_completed',
        expect.objectContaining({
          performance_category: 'very_poor'
        })
      );
    });
  });

  describe('Bundle Performance Tracking', () => {
    it('should track bundle metrics', () => {
      const bundleMetrics = {
        aiComponentSize: 150,
        dynamicImportTime: 200,
        memoryUsage: 15
      };
      
      monitor.trackBundleMetrics(bundleMetrics);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_bundle_performance',
        expect.objectContaining({
          aiComponentSize: 150,
          dynamicImportTime: 200,
          memoryUsage: 15,
          bundle_category: expect.any(String)
        })
      );
    });

    it('should track component mount performance', () => {
      monitor.trackComponentMount('AIAssistant', 50);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_component_mounted',
        expect.objectContaining({
          component_name: 'AIAssistant',
          mount_time_ms: 50
        })
      );
    });

    it('should track dynamic imports', () => {
      monitor.trackDynamicImport('ai-assistant', 300, 120000);
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('ai_dynamic_import',
        expect.objectContaining({
          import_name: 'ai-assistant',
          import_time_ms: 300,
          bundle_size_bytes: 120000
        })
      );
    });
  });

  describe('Performance Statistics', () => {
    it('should provide performance statistics', () => {
      const stats = monitor.getPerformanceStats();
      
      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('bundleMetrics');
      
      expect(typeof stats.activeRequests).toBe('number');
      expect(typeof stats.averageResponseTime).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });
  });
});

describe('BundleSizeMonitor', () => {
  let monitor: BundleSizeMonitor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    monitor = createBundleSizeMonitor(mockPostHog as any);
  });

  describe('Dynamic Import Tracking', () => {
    it('should track successful dynamic imports', async () => {
      const mockImport = jest.fn().mockResolvedValue({ default: 'component' });
      
      const result = await monitor.trackDynamicImport('ai-assistant', mockImport);
      
      expect(result).toEqual({ default: 'component' });
      expect(mockPostHog.capture).toHaveBeenCalledWith('bundle_dynamic_import',
        expect.objectContaining({
          import_name: 'ai-assistant',
          load_time_ms: expect.any(Number),
          estimated_size_kb: expect.any(Number)
        })
      );
    });

    it('should track failed dynamic imports', async () => {
      const mockImport = jest.fn().mockRejectedValue(new Error('Import failed'));
      
      await expect(monitor.trackDynamicImport('ai-assistant', mockImport))
        .rejects.toThrow('Import failed');
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('bundle_import_failed',
        expect.objectContaining({
          import_name: 'ai-assistant',
          error_message: 'Import failed'
        })
      );
    });
  });

  describe('Component Mount Tracking', () => {
    it('should track component mount performance', () => {
      const mockCallback = jest.fn();
      
      monitor.trackComponentMount('AIAssistant', mockCallback);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockPostHog.capture).toHaveBeenCalledWith('bundle_component_mount',
        expect.objectContaining({
          component_name: 'AIAssistant',
          mount_time_ms: expect.any(Number),
          memory_impact_mb: expect.any(Number),
          performance_category: expect.any(String)
        })
      );
    });
  });

  describe('Bundle Analysis', () => {
    it('should analyze bundle impact and provide suggestions', () => {
      // Set up some metrics first
      monitor.trackComponentMount('AIAssistant', () => {});
      
      const analysis = monitor.analyzeBundleImpact();
      
      expect(analysis).toHaveProperty('canLazyLoad');
      expect(analysis).toHaveProperty('canCodeSplit');
      expect(analysis).toHaveProperty('canTreeShake');
      expect(analysis).toHaveProperty('estimatedSavings');
      expect(analysis).toHaveProperty('recommendations');
      
      expect(Array.isArray(analysis.recommendations)).toBe(true);
      expect(typeof analysis.estimatedSavings).toBe('number');
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('bundle_optimization_analysis',
        expect.objectContaining({
          total_size_kb: expect.any(Number),
          can_lazy_load: expect.any(Boolean),
          can_code_split: expect.any(Boolean),
          can_tree_shake: expect.any(Boolean),
          estimated_savings_kb: expect.any(Number),
          recommendations_count: expect.any(Number)
        })
      );
    });
  });

  describe('Bundle Metrics Tracking', () => {
    it('should track bundle size metrics', () => {
      monitor.trackBundleMetrics();
      
      expect(mockPostHog.capture).toHaveBeenCalledWith('bundle_size_metrics',
        expect.objectContaining({
          ai_assistant_size_kb: expect.any(Number),
          gemini_sdk_size_kb: expect.any(Number),
          total_ai_bundle_size_kb: expect.any(Number),
          bundle_category: expect.any(String)
        })
      );
    });
  });

  describe('Bundle Metrics Access', () => {
    it('should provide bundle metrics', () => {
      const metrics = monitor.getBundleMetrics();
      
      expect(typeof metrics).toBe('object');
      // Bundle metrics start empty, so we just check the structure exists
      expect(metrics).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  it('should work together for complete performance monitoring', () => {
    const performanceMonitor = createAIPerformanceMonitor(mockPostHog as any);
    const bundleMonitor = createBundleSizeMonitor(mockPostHog as any);
    
    // Simulate a complete AI request flow
    const sessionId = 'integration-test';
    
    // Start request
    performanceMonitor.startRequest(sessionId, {
      message: 'test question',
      contextSize: 2000,
      cacheHit: false
    });
    
    // Track bundle loading
    bundleMonitor.trackComponentMount('AIAssistant', () => {});
    
    // Track streaming
    performanceMonitor.trackStreamingStart(sessionId);
    performanceMonitor.trackFirstChunk(sessionId);
    performanceMonitor.trackChunk(sessionId, 100);
    
    // Complete request
    const metrics = performanceMonitor.completeRequest(sessionId, true);
    
    // Get bundle analysis
    const bundleAnalysis = bundleMonitor.analyzeBundleImpact();
    
    expect(metrics).toBeDefined();
    expect(bundleAnalysis).toBeDefined();
    expect(mockPostHog.capture).toHaveBeenCalledTimes(7); // All tracking events (updated count)
  });
});