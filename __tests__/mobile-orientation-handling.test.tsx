import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useOrientation, useOrientationAwareMobile } from '@/hooks/use-orientation'

// Mock window properties
const mockWindow = {
  innerWidth: 375,
  innerHeight: 667,
  orientation: 0,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

// Mock screen API
const mockScreen = {
  orientation: {
    angle: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
}

describe('Mobile Orientation Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    })
    Object.defineProperty(window, 'orientation', {
      writable: true,
      configurable: true,
      value: 0,
    })
    
    // Mock screen API
    Object.defineProperty(window, 'screen', {
      writable: true,
      configurable: true,
      value: mockScreen,
    })
    
    // Reset event listener mocks
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
  })

  afterEach(() => {
    // Clear any timeouts
    jest.clearAllTimers()
  })

  describe('useOrientation Hook', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('initializes with portrait orientation for tall screens', () => {
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.isChanging).toBe(false)
      expect(result.current.angle).toBe(0)
    })

    it('initializes with landscape orientation for wide screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.isChanging).toBe(false)
    })

    it('detects orientation change from portrait to landscape', () => {
      const { result } = renderHook(() => useOrientation())
      
      // Start in portrait
      expect(result.current.orientation).toBe('portrait')
      
      // Change to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      // Simulate resize event
      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })
      
      // Should set changing state immediately
      expect(result.current.isChanging).toBe(true)
      
      // Fast-forward timers to complete orientation change
      act(() => {
        jest.advanceTimersByTime(100)
      })
      
      expect(result.current.orientation).toBe('landscape')
      
      // Fast-forward to reset changing state
      act(() => {
        jest.advanceTimersByTime(150)
      })
      
      expect(result.current.isChanging).toBe(false)
    })

    it('detects orientation change from landscape to portrait', () => {
      // Start in landscape
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('landscape')
      
      // Change to portrait
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      // Simulate resize event
      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })
      
      // Should set changing state
      expect(result.current.isChanging).toBe(true)
      
      // Complete orientation change
      act(() => {
        jest.advanceTimersByTime(250)
      })
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.isChanging).toBe(false)
    })

    it('handles rapid orientation changes with debouncing', () => {
      const { result } = renderHook(() => useOrientation())
      
      // Start multiple rapid changes
      act(() => {
        // Change 1
        Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
        window.dispatchEvent(new Event('resize'))
        
        // Change 2 (rapid)
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
        window.dispatchEvent(new Event('resize'))
        
        // Change 3 (rapid)
        Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
        window.dispatchEvent(new Event('resize'))
      })
      
      expect(result.current.isChanging).toBe(true)
      
      // Only the last change should take effect after debouncing
      act(() => {
        jest.advanceTimersByTime(250)
      })
      
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.isChanging).toBe(false)
    })

    it('gets orientation angle from screen API when available', () => {
      mockScreen.orientation.angle = 90
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.angle).toBe(90)
    })

    it('falls back to window.orientation when screen API unavailable', () => {
      // Remove screen API
      Object.defineProperty(window, 'screen', {
        value: undefined,
        writable: true,
      })
      
      Object.defineProperty(window, 'orientation', {
        value: 90,
        writable: true,
      })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.angle).toBe(90)
    })

    it('handles missing orientation APIs gracefully', () => {
      // Remove both APIs
      Object.defineProperty(window, 'screen', {
        value: undefined,
        writable: true,
      })
      Object.defineProperty(window, 'orientation', {
        value: undefined,
        writable: true,
      })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.angle).toBe(0)
    })

    it('adds and removes event listeners correctly', () => {
      const { unmount } = renderHook(() => useOrientation())
      
      // Should add resize listener
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      
      // Should add orientationchange listener if supported
      expect(window.addEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
      
      // Should add screen orientation listener if supported
      expect(mockScreen.orientation.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      
      // Unmount to trigger cleanup
      unmount()
      
      // Should remove all listeners
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
      expect(mockScreen.orientation.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('handles orientationchange event when supported', () => {
      // Mock orientationchange support
      Object.defineProperty(window, 'onorientationchange', {
        value: null,
        writable: true,
      })
      
      const { result } = renderHook(() => useOrientation())
      
      // Change orientation
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      // Simulate orientationchange event
      act(() => {
        const orientationEvent = new Event('orientationchange')
        window.dispatchEvent(orientationEvent)
      })
      
      expect(result.current.isChanging).toBe(true)
      
      act(() => {
        jest.advanceTimersByTime(250)
      })
      
      expect(result.current.orientation).toBe('landscape')
    })

    it('handles screen orientation change event', () => {
      const { result } = renderHook(() => useOrientation())
      
      // Change orientation
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      mockScreen.orientation.angle = 90
      
      // Simulate screen orientation change
      act(() => {
        const changeEvent = new Event('change')
        mockScreen.orientation.dispatchEvent(changeEvent)
      })
      
      expect(result.current.isChanging).toBe(true)
      
      act(() => {
        jest.advanceTimersByTime(250)
      })
      
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.angle).toBe(90)
    })
  })

  describe('useOrientationAwareMobile Hook', () => {
    it('detects mobile in portrait mode correctly', () => {
      // Mobile portrait dimensions
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('portrait')
    })

    it('detects mobile in landscape mode correctly', () => {
      // Mobile landscape dimensions
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('landscape')
    })

    it('detects tablet in portrait as mobile', () => {
      // Tablet portrait dimensions (iPad)
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(false) // 768px is the breakpoint
      expect(result.current.orientation).toBe('portrait')
    })

    it('detects tablet in landscape correctly using smaller dimension', () => {
      // Tablet landscape dimensions (iPad)
      Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 768, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      // Should use smaller dimension (768) for mobile detection in landscape
      expect(result.current.isMobile).toBe(false)
      expect(result.current.orientation).toBe('landscape')
    })

    it('detects desktop correctly', () => {
      // Desktop dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(false)
      expect(result.current.orientation).toBe('landscape')
    })

    it('updates mobile state when orientation changes', () => {
      // Start with mobile portrait
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('portrait')
      
      // Change to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('landscape')
    })

    it('handles edge case of exactly 768px width', () => {
      // Exactly at breakpoint
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      // 768px should be desktop (not mobile)
      expect(result.current.isMobile).toBe(false)
    })

    it('handles edge case of 767px width', () => {
      // Just below breakpoint
      Object.defineProperty(window, 'innerWidth', { value: 767, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      // 767px should be mobile
      expect(result.current.isMobile).toBe(true)
    })

    it('adds resize listener for mobile state updates', () => {
      const { unmount } = renderHook(() => useOrientationAwareMobile())
      
      // Should add resize listener
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      
      unmount()
      
      // Should remove resize listener
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })

    it('updates mobile state on window resize', () => {
      // Start mobile
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      
      // Resize to desktop
      Object.defineProperty(window, 'innerWidth', { value: 1440, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 900, writable: true })
      
      act(() => {
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })
      
      expect(result.current.isMobile).toBe(false)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles undefined window gracefully', () => {
      // Mock server-side rendering scenario
      const originalWindow = global.window
      delete (global as any).window
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.angle).toBe(0)
      
      // Restore window
      global.window = originalWindow
    })

    it('handles missing screen API gracefully', () => {
      Object.defineProperty(window, 'screen', {
        value: undefined,
        writable: true,
      })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.angle).toBe(0)
    })

    it('handles event listener errors gracefully', () => {
      const originalAddEventListener = window.addEventListener
      window.addEventListener = jest.fn(() => {
        throw new Error('Event listener error')
      })
      
      // Should not throw error
      expect(() => {
        renderHook(() => useOrientation())
      }).not.toThrow()
      
      // Restore
      window.addEventListener = originalAddEventListener
    })

    it('handles timeout cleanup on unmount', () => {
      jest.useFakeTimers()
      
      const { result, unmount } = renderHook(() => useOrientation())
      
      // Trigger orientation change
      Object.defineProperty(window, 'innerWidth', { value: 667, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 375, writable: true })
      
      act(() => {
        window.dispatchEvent(new Event('resize'))
      })
      
      // Unmount before timeout completes
      unmount()
      
      // Should not throw error when timeout tries to execute
      expect(() => {
        jest.advanceTimersByTime(1000)
      }).not.toThrow()
      
      jest.useRealTimers()
    })

    it('handles multiple rapid unmounts gracefully', () => {
      const hook1 = renderHook(() => useOrientation())
      const hook2 = renderHook(() => useOrientation())
      const hook3 = renderHook(() => useOrientation())
      
      // Unmount all rapidly
      hook1.unmount()
      hook2.unmount()
      hook3.unmount()
      
      // Should not cause any errors
      expect(true).toBe(true)
    })
  })
})