/**
 * Template Bundle Optimization System
 * 
 * Provides bundle size optimization, code splitting, and lazy loading
 * for template system components to improve loading performance.
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react'
import { getPerformanceMonitor } from './template-performance-monitor'

// Bundle analysis types
export interface BundleAnalysis {
  totalSize: number
  gzippedSize: number
  components: ComponentAnalysis[]
  dependencies: DependencyAnalysis[]
  recommendations: OptimizationRecommendation[]
}

export interface ComponentAnalysis {
  name: string
  size: number
  loadTime: number
  usage: 'critical' | 'important' | 'optional'
  splitRecommended: boolean
}

export interface DependencyAnalysis {
  name: string
  size: number
  version: string
  treeshakeable: boolean
  alternatives?: string[]
}

export interface OptimizationRecommendation {
  type: 'code-split' | 'lazy-load' | 'tree-shake' | 'replace-dependency' | 'preload'
  component: string
  impact: 'high' | 'medium' | 'low'
  description: string
  implementation: string
}

// Lazy loading utilities
class LazyComponentLoader {
  private loadingComponents = new Map<string, Promise<any>>()
  private loadedComponents = new Map<string, ComponentType<any>>()
  private preloadQueue = new Set<string>()

  // Create lazy component with performance monitoring
  createLazyComponent<T = {}>(
    importFn: () => Promise<{ default: ComponentType<T> }>,
    componentName: string,
    preload: boolean = false
  ): LazyExoticComponent<ComponentType<T>> {
    const monitor = getPerformanceMonitor()

    const wrappedImportFn = async () => {
      const startTime = performance.now()
      
      try {
        const module = await importFn()
        const loadTime = performance.now() - startTime
        
        monitor.recordMetric('load', loadTime, {
          component: componentName,
          type: 'lazy-load',
          success: true
        })

        this.loadedComponents.set(componentName, module.default)
        return module
      } catch (error) {
        const loadTime = performance.now() - startTime
        
        monitor.recordMetric('load', loadTime, {
          component: componentName,
          type: 'lazy-load',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    }

    const lazyComponent = lazy(wrappedImportFn)

    // Preload if requested
    if (preload) {
      this.preloadComponent(componentName, wrappedImportFn)
    }

    return lazyComponent
  }

  // Preload component for better UX
  preloadComponent(componentName: string, importFn: () => Promise<any>) {
    if (this.loadedComponents.has(componentName) || this.preloadQueue.has(componentName)) {
      return
    }

    this.preloadQueue.add(componentName)

    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.loadingComponents.set(componentName, importFn())
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        this.loadingComponents.set(componentName, importFn())
      }, 100)
    }
  }

  // Check if component is loaded
  isComponentLoaded(componentName: string): boolean {
    return this.loadedComponents.has(componentName)
  }

  // Get loading status
  getLoadingStatus(): {
    loaded: string[]
    loading: string[]
    preloading: string[]
  } {
    return {
      loaded: Array.from(this.loadedComponents.keys()),
      loading: Array.from(this.loadingComponents.keys()),
      preloading: Array.from(this.preloadQueue)
    }
  }
}

// Global lazy loader instance
const lazyLoader = new LazyComponentLoader()

// Optimized lazy components for template system
export const LazyTemplateComponents = {
  // Core editor components (critical - preload)
  TiptapTemplateEditor: lazyLoader.createLazyComponent(
    () => import('../components/editor/tiptap-template-editor'),
    'TiptapTemplateEditor',
    true
  ),

  // Enhanced features (important - load on demand)
  EnhancedToolbar: lazyLoader.createLazyComponent(
    () => import('../components/editor/enhanced-toolbar'),
    'EnhancedToolbar'
  ),

  BubbleMenu: lazyLoader.createLazyComponent(
    () => import('../components/editor/bubble-menu'),
    'BubbleMenu'
  ),

  SlashCommandsList: lazyLoader.createLazyComponent(
    () => import('../components/editor/slash-commands-list'),
    'SlashCommandsList'
  ),

  MentionList: lazyLoader.createLazyComponent(
    () => import('../components/editor/mention-list'),
    'MentionList'
  ),

  // Modal components (optional - load when needed)
  TemplateEditorModal: lazyLoader.createLazyComponent(
    () => import('../components/template-editor-modal'),
    'TemplateEditorModal'
  ),

  CategorySelectionModal: lazyLoader.createLazyComponent(
    () => import('../components/category-selection-modal'),
    'CategorySelectionModal'
  ),

  // Validation and feedback (optional)
  TemplateValidationFeedback: lazyLoader.createLazyComponent(
    () => import('../components/template-validation-feedback'),
    'TemplateValidationFeedback'
  ),

  TemplateContentValidationFeedback: lazyLoader.createLazyComponent(
    () => import('../components/template-content-validation-feedback'),
    'TemplateContentValidationFeedback'
  ),

  // Onboarding and help (optional)
  TemplateOnboarding: lazyLoader.createLazyComponent(
    () => import('../components/template-onboarding'),
    'TemplateOnboarding'
  ),

  // Performance monitoring (development only)
  PerformanceDashboard: lazyLoader.createLazyComponent(
    () => import('../components/template-performance-dashboard'),
    'PerformanceDashboard'
  )
}

// Bundle size analyzer
export class BundleSizeAnalyzer {
  private componentSizes = new Map<string, number>()
  private dependencySizes = new Map<string, number>()

  // Estimate component size (simplified)
  estimateComponentSize(componentName: string, sourceCode?: string): number {
    if (sourceCode) {
      // Rough estimation based on source code length
      const baseSize = sourceCode.length
      const importCount = (sourceCode.match(/import/g) || []).length
      const exportCount = (sourceCode.match(/export/g) || []).length
      
      // Factor in imports and exports
      const estimatedSize = baseSize + (importCount * 100) + (exportCount * 50)
      
      this.componentSizes.set(componentName, estimatedSize)
      return estimatedSize
    }

    // Return cached size or default estimate
    return this.componentSizes.get(componentName) || 5000 // 5KB default
  }

  // Analyze bundle composition
  analyzeBundleComposition(): BundleAnalysis {
    const components: ComponentAnalysis[] = [
      {
        name: 'TiptapTemplateEditor',
        size: this.estimateComponentSize('TiptapTemplateEditor'),
        loadTime: 150,
        usage: 'critical',
        splitRecommended: false
      },
      {
        name: 'EnhancedToolbar',
        size: this.estimateComponentSize('EnhancedToolbar'),
        loadTime: 50,
        usage: 'important',
        splitRecommended: true
      },
      {
        name: 'BubbleMenu',
        size: this.estimateComponentSize('BubbleMenu'),
        loadTime: 30,
        usage: 'important',
        splitRecommended: true
      },
      {
        name: 'TemplateOnboarding',
        size: this.estimateComponentSize('TemplateOnboarding'),
        loadTime: 80,
        usage: 'optional',
        splitRecommended: true
      }
    ]

    const dependencies: DependencyAnalysis[] = [
      {
        name: '@tiptap/react',
        size: 45000, // ~45KB
        version: '^3.4.2',
        treeshakeable: true
      },
      {
        name: '@tiptap/starter-kit',
        size: 25000, // ~25KB
        version: '^3.4.2',
        treeshakeable: true
      },
      {
        name: 'framer-motion',
        size: 120000, // ~120KB
        version: '^12.16.0',
        treeshakeable: false,
        alternatives: ['react-spring', 'react-transition-group']
      }
    ]

    const totalSize = components.reduce((sum, c) => sum + c.size, 0) +
                     dependencies.reduce((sum, d) => sum + d.size, 0)

    const recommendations: OptimizationRecommendation[] = [
      {
        type: 'code-split',
        component: 'TemplateOnboarding',
        impact: 'medium',
        description: 'Split onboarding component to reduce initial bundle size',
        implementation: 'Use React.lazy() and Suspense for onboarding modal'
      },
      {
        type: 'lazy-load',
        component: 'EnhancedToolbar',
        impact: 'low',
        description: 'Lazy load toolbar to improve initial render time',
        implementation: 'Load toolbar after editor initialization'
      },
      {
        type: 'tree-shake',
        component: '@tiptap/starter-kit',
        impact: 'high',
        description: 'Import only needed extensions from starter kit',
        implementation: 'Import individual extensions instead of full starter kit'
      },
      {
        type: 'preload',
        component: 'TiptapTemplateEditor',
        impact: 'high',
        description: 'Preload critical editor component',
        implementation: 'Add preload hints and prefetch resources'
      }
    ]

    return {
      totalSize,
      gzippedSize: Math.round(totalSize * 0.3), // Rough gzip estimate
      components,
      dependencies,
      recommendations
    }
  }

  // Generate optimization report
  generateOptimizationReport(): string {
    const analysis = this.analyzeBundleComposition()
    
    let report = '# Template Bundle Optimization Report\n\n'
    
    report += `## Bundle Size Analysis\n`
    report += `- Total Size: ${(analysis.totalSize / 1024).toFixed(2)} KB\n`
    report += `- Gzipped Size: ${(analysis.gzippedSize / 1024).toFixed(2)} KB\n\n`
    
    report += `## Component Analysis\n`
    analysis.components.forEach(comp => {
      report += `- **${comp.name}**: ${(comp.size / 1024).toFixed(2)} KB (${comp.usage})\n`
      if (comp.splitRecommended) {
        report += `  - ✅ Code splitting recommended\n`
      }
    })
    report += '\n'
    
    report += `## Dependencies\n`
    analysis.dependencies.forEach(dep => {
      report += `- **${dep.name}** v${dep.version}: ${(dep.size / 1024).toFixed(2)} KB\n`
      if (dep.treeshakeable) {
        report += `  - ✅ Tree-shakeable\n`
      }
      if (dep.alternatives) {
        report += `  - 💡 Alternatives: ${dep.alternatives.join(', ')}\n`
      }
    })
    report += '\n'
    
    report += `## Optimization Recommendations\n`
    analysis.recommendations.forEach((rec, index) => {
      report += `${index + 1}. **${rec.type.toUpperCase()}** - ${rec.component} (${rec.impact} impact)\n`
      report += `   - ${rec.description}\n`
      report += `   - Implementation: ${rec.implementation}\n\n`
    })
    
    return report
  }
}

// Resource preloading utilities
export class ResourcePreloader {
  private preloadedResources = new Set<string>()

  // Preload critical resources
  preloadCriticalResources() {
    const resources = [
      // TipTap core
      '/node_modules/@tiptap/react/dist/index.js',
      '/node_modules/@tiptap/starter-kit/dist/index.js',
      
      // Editor components
      '/components/editor/tiptap-template-editor.js',
      
      // Critical styles
      '/components/template-animations.css'
    ]

    resources.forEach(resource => this.preloadResource(resource, 'script'))
  }

  // Preload specific resource
  preloadResource(href: string, as: 'script' | 'style' | 'font' | 'image' = 'script') {
    if (this.preloadedResources.has(href) || typeof document === 'undefined') {
      return
    }

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = href
    link.as = as
    
    if (as === 'script') {
      link.crossOrigin = 'anonymous'
    }

    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  // Prefetch non-critical resources
  prefetchResource(href: string) {
    if (this.preloadedResources.has(href) || typeof document === 'undefined') {
      return
    }

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = href

    document.head.appendChild(link)
    this.preloadedResources.add(href)
  }

  // Get preload status
  getPreloadStatus(): {
    preloaded: string[]
    total: number
  } {
    return {
      preloaded: Array.from(this.preloadedResources),
      total: this.preloadedResources.size
    }
  }
}

// Global instances
export const bundleAnalyzer = new BundleSizeAnalyzer()
export const resourcePreloader = new ResourcePreloader()

// Initialize optimizations
export function initializeBundleOptimizations() {
  // Preload critical resources
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback for non-blocking initialization
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        resourcePreloader.preloadCriticalResources()
      })
    } else {
      setTimeout(() => {
        resourcePreloader.preloadCriticalResources()
      }, 100)
    }
  }
}

// Export lazy loader for external use
export { lazyLoader }