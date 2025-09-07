/**
 * @jest-environment jsdom
 */

import { useMobilePerformance, useOptimizedAnimations, useMobileDebounce } from '@/hooks/use-mobile-performance'
import { renderHook, act } from '@testing-library/react'

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    jsHeapSizeLimit: 10000000
  }
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true
})

Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4,
  writable: true
})

Object.defineProperty(navigator, 'deviceMemory', {
  value: 4,
  writable: true
})

describe('Mobile Performance Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPerformance.now.mockReturnValue(Date.now())
  })

  describe('useMobilePerformance', () => {
    it('should detect device capabilities', () => {
      const { result } = renderHook(() => useMobilePerformance())
      
      expect(result.current.isLowEndDevice).toBe(false)
      expect(typeof result.current.getPerformanceMetrics).toBe('function')
      expect(typeof result.current.resetMetrics).toBe('function')
    })

    it('should detect low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2,
        writable: true
      })
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 1,
        writable: true
      })

      const { result } = renderHook(() => useMobilePerformance())
      
      expect(result.current.isLowEndDevice).toBe(true)
    })

    it('should provide performance metrics', () => {
      const { result } = renderHook(() => useMobilePerformance())
      
      const metrics = result.current.getPerformanceMetrics()
      
      expect(metrics).toHaveProperty('renderTime')
      expect(metrics).toHaveProperty('animationFrames')
      expect(metrics).toHaveProperty('isLowEndDevice')
      expect(typeof metrics.renderTime).toBe('number')
      expect(typeof metrics.animationFrames).toBe('number')
      expect(typeof metrics.isLowEndDevice).toBe('boolean')
    })
  })

  describe('useOptimizedAnimations', () => {
    it('should provide animation settings', () => {
      const { result } = renderHook(() => useOptimizedAnimations())
      
      expect(result.current).toHaveProperty('duration')
      expect(result.current).toHaveProperty('easing')
      expect(result.current).toHaveProperty('shouldReduceMotion')
      expect(typeof result.current.duration).toBe('number')
      expect(typeof result.current.easing).toBe('string')
      expect(typeof result.current.shouldReduceMotion).toBe('boolean')
    })

    it('should reduce animations for low-end devices', () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 1,
        writable: true
      })

      const { result } = renderHook(() => useOptimizedAnimations())
      
      expect(result.current.duration).toBe(150)
      expect(result.current.easing).toBe('ease-out')
      expect(result.current.shouldReduceMotion).toBe(true)
    })
  })

  describe('useMobileDebounce', () => {
    it('should debounce function calls', async () => {
      const mockCallback = jest.fn()
      
      const { result } = renderHook(() => useMobileDebounce(mockCallback, 100))
      
      // Call multiple times rapidly
      act(() => {
        result.current('test1')
        result.current('test2')
        result.current('test3')
      })
      
      // Should not have been called yet
      expect(mockCallback).not.toHaveBeenCalled()
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(mockCallback).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledWith('test3')
    })
  })
})

describe('Performance Utilities', () => {
  it('should handle missing performance APIs gracefully', () => {
    // Mock missing performance API
    const originalPerformance = window.performance
    Object.defineProperty(window, 'performance', {
      value: undefined,
      writable: true
    })
    
    const { result } = renderHook(() => useMobilePerformance())
    
    expect(() => result.current.getPerformanceMetrics()).not.toThrow()
    
    // Restore performance API
    Object.defineProperty(window, 'performance', {
      value: originalPerformance,
      writable: true
    })
  })

  it('should provide consistent performance metrics', () => {
    const { result } = renderHook(() => useMobilePerformance())
    
    const metrics1 = result.current.getPerformanceMetrics()
    const metrics2 = result.current.getPerformanceMetrics()
    
    // Metrics should be consistent in structure
    expect(Object.keys(metrics1)).toEqual(Object.keys(metrics2))
    expect(typeof metrics1.isLowEndDevice).toBe('boolean')
    expect(typeof metrics2.isLowEndDevice).toBe('boolean')
  })
})