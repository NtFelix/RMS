/**
 * Bundle Size Monitoring for AI Assistant
 * 
 * This module provides utilities to monitor and track bundle size impact
 * of the AI assistant components and dependencies.
 */

import { PostHog } from 'posthog-js';

export interface BundleSizeMetrics {
  // Component sizes
  aiAssistantSize?: number;
  geminiSDKSize?: number;
  totalAIBundleSize?: number;
  
  // Loading metrics
  initialLoadTime?: number;
  dynamicImportTime?: number;
  
  // Performance impact
  mainBundleSize?: number;
  chunkSizes?: Record<string, number>;
  
  // Runtime metrics
  memoryFootprint?: number;
  renderingImpact?: number;
}

export interface BundleOptimizationSuggestions {
  canLazyLoad: boolean;
  canCodeSplit: boolean;
  canTreeShake: boolean;
  estimatedSavings: number;
  recommendations: string[];
}

export class BundleSizeMonitor {
  private posthog: PostHog | null = null;
  private metrics: BundleSizeMetrics = {};
  private loadStartTime: number = 0;
  
  // Bundle size thresholds (in KB)
  private readonly THRESHOLDS = {
    SMALL: 50,
    MEDIUM: 150,
    LARGE: 300,
    VERY_LARGE: 500
  };

  constructor(posthog?: PostHog | null) {
    this.posthog = posthog || null;
    this.loadStartTime = performance.now();
    
    this.initializeBundleMonitoring();
  }

  /**
   * Track dynamic import of AI components
   */
  async trackDynamicImport<T>(
    importName: string,
    importFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await importFn();
      const loadTime = performance.now() - startTime;
      
      this.metrics.dynamicImportTime = loadTime;
      
      // Estimate bundle size based on loading time and network conditions
      const estimatedSize = this.estimateBundleSize(loadTime);
      
      if (importName.includes('ai-assistant')) {
        this.metrics.aiAssistantSize = estimatedSize;
      } else if (importName.includes('gemini') || importName.includes('genai')) {
        this.metrics.geminiSDKSize = estimatedSize;
      }
      
      this.trackEvent('bundle_dynamic_import', {
        import_name: importName,
        load_time_ms: loadTime,
        estimated_size_kb: estimatedSize,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      this.trackEvent('bundle_import_failed', {
        import_name: importName,
        error_message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Track component mount and measure rendering impact
   */
  trackComponentMount(componentName: string, callback: () => void): void {
    const startTime = performance.now();
    
    // Measure memory before component mount
    const memoryBefore = this.getCurrentMemoryUsage();
    
    callback();
    
    const mountTime = performance.now() - startTime;
    const memoryAfter = this.getCurrentMemoryUsage();
    const memoryImpact = memoryAfter - memoryBefore;
    
    this.metrics.renderingImpact = mountTime;
    this.metrics.memoryFootprint = memoryImpact;
    
    this.trackEvent('bundle_component_mount', {
      component_name: componentName,
      mount_time_ms: mountTime,
      memory_impact_mb: memoryImpact,
      performance_category: this.categorizePerformance(mountTime),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Analyze bundle size impact and provide optimization suggestions
   */
  analyzeBundleImpact(): BundleOptimizationSuggestions {
    const totalSize = this.getTotalAIBundleSize();
    
    const suggestions: BundleOptimizationSuggestions = {
      canLazyLoad: totalSize > this.THRESHOLDS.MEDIUM,
      canCodeSplit: totalSize > this.THRESHOLDS.LARGE,
      canTreeShake: this.metrics.geminiSDKSize ? this.metrics.geminiSDKSize > this.THRESHOLDS.SMALL : false,
      estimatedSavings: 0,
      recommendations: []
    };
    
    // Calculate potential savings
    if (suggestions.canLazyLoad) {
      suggestions.estimatedSavings += totalSize * 0.3; // 30% savings from lazy loading
      suggestions.recommendations.push('Implement lazy loading for AI assistant components');
    }
    
    if (suggestions.canCodeSplit) {
      suggestions.estimatedSavings += totalSize * 0.2; // 20% savings from code splitting
      suggestions.recommendations.push('Split AI assistant into separate chunks');
    }
    
    if (suggestions.canTreeShake) {
      suggestions.estimatedSavings += (this.metrics.geminiSDKSize || 0) * 0.4; // 40% savings from tree shaking
      suggestions.recommendations.push('Optimize Gemini SDK imports with tree shaking');
    }
    
    // Memory optimization suggestions
    if (this.metrics.memoryFootprint && this.metrics.memoryFootprint > 10) {
      suggestions.recommendations.push('Optimize component memory usage');
    }
    
    // Performance optimization suggestions
    if (this.metrics.renderingImpact && this.metrics.renderingImpact > 100) {
      suggestions.recommendations.push('Optimize component rendering performance');
    }
    
    this.trackEvent('bundle_optimization_analysis', {
      total_size_kb: totalSize,
      can_lazy_load: suggestions.canLazyLoad,
      can_code_split: suggestions.canCodeSplit,
      can_tree_shake: suggestions.canTreeShake,
      estimated_savings_kb: suggestions.estimatedSavings,
      recommendations_count: suggestions.recommendations.length,
      timestamp: new Date().toISOString()
    });
    
    return suggestions;
  }

  /**
   * Track bundle size metrics periodically
   */
  trackBundleMetrics(): void {
    const totalSize = this.getTotalAIBundleSize();
    const category = this.categorizeBundleSize(totalSize);
    
    this.trackEvent('bundle_size_metrics', {
      ai_assistant_size_kb: this.metrics.aiAssistantSize || 0,
      gemini_sdk_size_kb: this.metrics.geminiSDKSize || 0,
      total_ai_bundle_size_kb: totalSize,
      main_bundle_size_kb: this.metrics.mainBundleSize || 0,
      dynamic_import_time_ms: this.metrics.dynamicImportTime || 0,
      memory_footprint_mb: this.metrics.memoryFootprint || 0,
      rendering_impact_ms: this.metrics.renderingImpact || 0,
      bundle_category: category,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Monitor bundle size impact on Core Web Vitals
   */
  trackWebVitals(): void {
    if (typeof window === 'undefined') return;
    
    // Track Largest Contentful Paint (LCP)
    this.observeWebVital('largest-contentful-paint', (entry) => {
      this.trackEvent('bundle_web_vital_lcp', {
        value_ms: entry.value,
        impact_category: this.categorizeWebVital(entry.value, 2500, 4000),
        timestamp: new Date().toISOString()
      });
    });
    
    // Track First Input Delay (FID)
    this.observeWebVital('first-input', (entry) => {
      this.trackEvent('bundle_web_vital_fid', {
        value_ms: entry.value,
        impact_category: this.categorizeWebVital(entry.value, 100, 300),
        timestamp: new Date().toISOString()
      });
    });
    
    // Track Cumulative Layout Shift (CLS)
    this.observeWebVital('layout-shift', (entry) => {
      if (!(entry as any).hadRecentInput) {
        this.trackEvent('bundle_web_vital_cls', {
          value: entry.value,
          impact_category: this.categorizeWebVital(entry.value, 0.1, 0.25),
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Get current bundle size metrics
   */
  getBundleMetrics(): BundleSizeMetrics {
    return { ...this.metrics };
  }

  /**
   * Initialize bundle monitoring
   */
  private initializeBundleMonitoring(): void {
    // Monitor resource loading
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              
              // Track AI-related resources
              if (entry.name.includes('ai-assistant') || 
                  entry.name.includes('gemini') || 
                  entry.name.includes('genai')) {
                
                const size = resourceEntry.transferSize || 0;
                const loadTime = resourceEntry.duration;
                
                this.trackEvent('bundle_resource_loaded', {
                  resource_name: entry.name,
                  size_bytes: size,
                  load_time_ms: loadTime,
                  timestamp: new Date().toISOString()
                });
                
                // Update metrics based on resource type
                if (entry.name.includes('ai-assistant')) {
                  this.metrics.aiAssistantSize = (this.metrics.aiAssistantSize || 0) + (size / 1024);
                } else if (entry.name.includes('gemini') || entry.name.includes('genai')) {
                  this.metrics.geminiSDKSize = (this.metrics.geminiSDKSize || 0) + (size / 1024);
                }
              }
            }
          });
        });
        
        observer.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Failed to initialize bundle monitoring:', error);
      }
    }
    
    // Track initial load completion
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now() - this.loadStartTime;
        this.metrics.initialLoadTime = loadTime;
        
        this.trackEvent('bundle_initial_load', {
          load_time_ms: loadTime,
          timestamp: new Date().toISOString()
        });
      });
    }
  }

  /**
   * Estimate bundle size based on loading time
   */
  private estimateBundleSize(loadTime: number): number {
    // Rough estimation based on typical network speeds
    // Assumes average connection speed of ~10 Mbps
    const bytesPerMs = 1250; // ~10 Mbps in bytes per millisecond
    const estimatedBytes = loadTime * bytesPerMs;
    return Math.round(estimatedBytes / 1024); // Convert to KB
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window.performance as any).memory) {
      return (window.performance as any).memory.usedJSHeapSize / (1024 * 1024); // MB
    }
    return 0;
  }

  /**
   * Get total AI bundle size
   */
  private getTotalAIBundleSize(): number {
    return (this.metrics.aiAssistantSize || 0) + (this.metrics.geminiSDKSize || 0);
  }

  /**
   * Categorize bundle size
   */
  private categorizeBundleSize(sizeKB: number): string {
    if (sizeKB < this.THRESHOLDS.SMALL) return 'small';
    if (sizeKB < this.THRESHOLDS.MEDIUM) return 'medium';
    if (sizeKB < this.THRESHOLDS.LARGE) return 'large';
    if (sizeKB < this.THRESHOLDS.VERY_LARGE) return 'very_large';
    return 'excessive';
  }

  /**
   * Categorize performance impact
   */
  private categorizePerformance(timeMs: number): string {
    if (timeMs < 16) return 'excellent'; // 60fps
    if (timeMs < 33) return 'good';      // 30fps
    if (timeMs < 100) return 'acceptable';
    return 'poor';
  }

  /**
   * Categorize Web Vital impact
   */
  private categorizeWebVital(value: number, goodThreshold: number, poorThreshold: number): string {
    if (value <= goodThreshold) return 'good';
    if (value <= poorThreshold) return 'needs_improvement';
    return 'poor';
  }

  /**
   * Observe Web Vitals
   */
  private observeWebVital(entryType: string, callback: (entry: PerformanceEntry) => void): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(callback);
      });
      
      observer.observe({ entryTypes: [entryType] });
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  /**
   * Track event to PostHog
   */
  private trackEvent(eventName: string, properties: Record<string, any>): void {
    if (this.posthog && this.posthog.has_opted_in_capturing?.()) {
      this.posthog.capture(eventName, properties);
    }
  }
}

/**
 * Create a bundle size monitor instance
 */
export function createBundleSizeMonitor(posthog?: PostHog | null): BundleSizeMonitor {
  return new BundleSizeMonitor(posthog);
}

/**
 * Hook for using bundle size monitoring in React components
 */
export function useBundleSizeMonitor(posthog?: PostHog | null) {
  return new BundleSizeMonitor(posthog);
}