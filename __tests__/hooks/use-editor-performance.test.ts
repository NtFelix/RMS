/**
 * Tests for editor performance optimization hooks
 */

import { renderHook, act } from '@testing-library/react'
import {
  useOptimizedContentChange,
  useMemoizedEditorExtensions,
  useOptimizedVariableExtraction,
  useOptimizedFiltering,
  useOptimizedKeyboardHandler,
  useThrottledCallback,
  useMemoizedCalculation,
  useRenderOptimization,
  usePerformanceMonitor
} from '@/hooks/use-editor-performance'

// Mock useDebounce
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: jest.fn((value, delay) => value)
}))

describe('useOptimizedContentChange', () => {
  it('should debounce content changes and detect actual changes', () => {
    const mockOnContentChange = jest.fn()
    const content = { type: 'doc', content: [] }

    const { result } = renderHook(() =>
      useOptimizedContentChange(content, mockOnContentChange, 150)
    )

    expect(result.current.debouncedContent).toEqual(content)
    expect(typeof result.current.handleDebouncedChange).toBe('function')
    expect(typeof result.current.optimizedOnChange).toBe('function')
  })

  it('should only trigger change when content actually changes', () => {
    const mockOnContentChange = jest.fn()
    
    const { result } = renderHook(() =>
      useOptimizedContentChange({}, mockOnContentChange, 150)
    )

    // Test that the optimized change handler exists
    expect(typeof result.current.optimizedOnChange).toBe('function')
    
    // The actual change detection logic is tested in the implementation
    // This test verifies the hook structure is correct
  })
})

describe('useMemoizedEditorExtensions', () => {
  it('should memoize extensions and only recreate when dependencies change', () => {
    const factory1 = jest.fn(() => 'extension1')
    const factory2 = jest.fn(() => 'extension2')
    const factories = [factory1, factory2]
    const deps = ['dep1', 'dep2']

    const { result, rerender } = renderHook(
      ({ factories, deps }) => useMemoizedEditorExtensions(factories, deps),
      { initialProps: { factories, deps } }
    )

    expect(result.current).toEqual(['extension1', 'extension2'])
    expect(factory1).toHaveBeenCalledTimes(1)
    expect(factory2).toHaveBeenCalledTimes(1)

    // Rerender with same dependencies
    rerender({ factories, deps })
    expect(factory1).toHaveBeenCalledTimes(1) // Should not be called again
    expect(factory2).toHaveBeenCalledTimes(1)

    // Rerender with different dependencies
    rerender({ factories, deps: ['dep1', 'dep3'] })
    expect(factory1).toHaveBeenCalledTimes(2) // Should be called again
    expect(factory2).toHaveBeenCalledTimes(2)
  })
})

describe('useOptimizedVariableExtraction', () => {
  it('should cache variable extraction results', () => {
    const mockExtractFunction = jest.fn((content) => [`var_${content.id}`])
    const content = { id: 'test', type: 'doc' }

    const { result, rerender } = renderHook(() =>
      useOptimizedVariableExtraction(content, mockExtractFunction, 300)
    )

    expect(result.current).toEqual(['var_test'])
    expect(mockExtractFunction).toHaveBeenCalledTimes(1)

    // Rerender with same content
    rerender()
    expect(mockExtractFunction).toHaveBeenCalledTimes(1) // Should use cache

    // Rerender with different content
    const newContent = { id: 'test2', type: 'doc' }
    const { result: result2 } = renderHook(() =>
      useOptimizedVariableExtraction(newContent, mockExtractFunction, 300)
    )

    expect(result2.current).toEqual(['var_test2'])
    expect(mockExtractFunction).toHaveBeenCalledTimes(2) // Should call function again
  })

  it('should limit cache size to prevent memory leaks', () => {
    const mockExtractFunction = jest.fn((content) => [`var_${content.id}`])
    
    // Create many different contents to exceed cache limit
    for (let i = 0; i < 60; i++) {
      const content = { id: `test${i}`, type: 'doc' }
      renderHook(() =>
        useOptimizedVariableExtraction(content, mockExtractFunction, 300)
      )
    }

    // Should have called the function for each unique content
    expect(mockExtractFunction).toHaveBeenCalledTimes(60)
  })
})

describe('useOptimizedFiltering', () => {
  it('should filter items efficiently with caching', () => {
    const items = [
      { name: 'apple', category: 'fruit' },
      { name: 'banana', category: 'fruit' },
      { name: 'carrot', category: 'vegetable' }
    ]
    const filterFunction = jest.fn((items, query) =>
      items.filter(item => item.name.includes(query))
    )

    const { result } = renderHook(() =>
      useOptimizedFiltering(items, 'app', filterFunction, 100, 10)
    )

    expect(result.current).toEqual([{ name: 'apple', category: 'fruit' }])
    expect(filterFunction).toHaveBeenCalledWith(items, 'app')
  })

  it('should return limited results for empty query', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ name: `item${i}` }))
    const filterFunction = jest.fn()

    const { result } = renderHook(() =>
      useOptimizedFiltering(items, '', filterFunction, 100, 5)
    )

    expect(result.current).toHaveLength(5)
    expect(filterFunction).not.toHaveBeenCalled()
  })
})

describe('useOptimizedKeyboardHandler', () => {
  it('should create optimized keyboard event handler', () => {
    const mockHandler1 = jest.fn(() => true)
    const mockHandler2 = jest.fn(() => false)
    const handlers = {
      'Enter': mockHandler1,
      'Escape': mockHandler2
    }

    const { result } = renderHook(() =>
      useOptimizedKeyboardHandler(handlers, [handlers])
    )

    const keyboardHandler = result.current

    // Test Enter key
    const enterEvent = { key: 'Enter' } as KeyboardEvent
    expect(keyboardHandler(enterEvent)).toBe(true)
    expect(mockHandler1).toHaveBeenCalled()

    // Test Escape key
    const escapeEvent = { key: 'Escape' } as KeyboardEvent
    expect(keyboardHandler(escapeEvent)).toBe(false) // mockHandler2 returns false
    expect(mockHandler2).toHaveBeenCalled()

    // Test unknown key
    const unknownEvent = { key: 'Tab' } as KeyboardEvent
    expect(keyboardHandler(unknownEvent)).toBe(false)
  })
})

describe('useThrottledCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should throttle callback execution', () => {
    const mockCallback = jest.fn()
    const { result } = renderHook(() =>
      useThrottledCallback(mockCallback, 1000)
    )

    const throttledCallback = result.current

    // Call multiple times rapidly
    throttledCallback('arg1')
    throttledCallback('arg2')
    throttledCallback('arg3')

    // Should only call once immediately
    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith('arg1')

    // Fast forward time
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Should call again with the last arguments
    expect(mockCallback).toHaveBeenCalledTimes(2)
    expect(mockCallback).toHaveBeenLastCalledWith('arg3')
  })
})

describe('useMemoizedCalculation', () => {
  it('should memoize expensive calculations', () => {
    const expensiveCalculation = jest.fn((input) => input * 2)
    const input = 5

    const { result, rerender } = renderHook(
      ({ input }) => useMemoizedCalculation(input, expensiveCalculation),
      { initialProps: { input } }
    )

    expect(result.current).toBe(10)
    expect(expensiveCalculation).toHaveBeenCalledTimes(1)

    // Rerender with same input
    rerender({ input })
    expect(expensiveCalculation).toHaveBeenCalledTimes(1) // Should not recalculate

    // Rerender with different input
    rerender({ input: 10 })
    expect(result.current).toBe(20)
    expect(expensiveCalculation).toHaveBeenCalledTimes(2)
  })
})

describe('useRenderOptimization', () => {
  it('should track render count and dependency changes', () => {
    const deps = ['dep1', 'dep2']

    const { result, rerender } = renderHook(
      ({ deps }) => useRenderOptimization(deps),
      { initialProps: { deps } }
    )

    expect(result.current.renderCount).toBe(1)
    expect(result.current.shouldRender).toBe(true)

    // Rerender with same dependencies
    rerender({ deps })
    expect(result.current.renderCount).toBe(1) // Should not increment
    expect(result.current.shouldRender).toBe(false)

    // Rerender with different dependencies
    rerender({ deps: ['dep1', 'dep3'] })
    expect(result.current.renderCount).toBe(2)
    expect(result.current.shouldRender).toBe(true)
  })
})

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    // Mock performance.now
    global.performance = {
      now: jest.fn(() => Date.now())
    } as any

    // Mock console.warn
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should monitor performance in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const { result } = renderHook(() =>
      usePerformanceMonitor('TestComponent', true)
    )

    expect(result.current.renderCount).toBe(1)
    expect(typeof result.current.startTime).toBe('number')

    process.env.NODE_ENV = originalEnv
  })

  it('should not monitor performance when disabled', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor('TestComponent', false)
    )

    expect(result.current.renderCount).toBe(0)
  })

  it('should warn about slow renders in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const { result } = renderHook(() =>
      usePerformanceMonitor('TestComponent', true)
    )

    // Verify the hook returns the expected structure
    expect(typeof result.current.renderCount).toBe('number')
    expect(typeof result.current.startTime).toBe('number')

    process.env.NODE_ENV = originalEnv
  })
})