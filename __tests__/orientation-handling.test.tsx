import { renderHook, act } from '@testing-library/react'
import { useOrientation, useOrientationAwareMobile } from '@/hooks/use-orientation'

// Mock window properties
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

const mockWindow = {
  innerWidth: 768,
  innerHeight: 1024,
  orientation: 0,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
}

const mockScreen = {
  orientation: {
    angle: 0,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
}

// Mock global objects
// Mock window methods
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  configurable: true,
  value: mockAddEventListener,
})

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  configurable: true,
  value: mockRemoveEventListener,
})

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: mockWindow.innerWidth,
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: mockWindow.innerHeight,
})

Object.defineProperty(window, 'orientation', {
  writable: true,
  configurable: true,
  value: mockWindow.orientation,
})

Object.defineProperty(global, 'screen', {
  writable: true,
  configurable: true,
  value: mockScreen,
})

describe('Orientation Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAddEventListener.mockClear()
    mockRemoveEventListener.mockClear()
    // Reset window dimensions to portrait
    mockWindow.innerWidth = 768
    mockWindow.innerHeight = 1024
    Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1024, configurable: true })
  })

  describe('useOrientation', () => {
    it('should detect portrait orientation correctly', () => {
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.isChanging).toBe(false)
    })

    it('should detect landscape orientation correctly', () => {
      // Set landscape dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024 })
      Object.defineProperty(window, 'innerHeight', { value: 768 })
      
      const { result } = renderHook(() => useOrientation())
      
      expect(result.current.orientation).toBe('landscape')
    })

    it('should handle orientation change events', () => {
      const { result } = renderHook(() => useOrientation())
      
      // Initially portrait
      expect(result.current.orientation).toBe('portrait')
      
      // Simulate orientation change to landscape
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024 })
        Object.defineProperty(window, 'innerHeight', { value: 768 })
        
        // Trigger resize event
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })
      
      // Should detect the change
      expect(result.current.isChanging).toBe(true)
    })

    it('should add and remove event listeners properly', () => {
      const { unmount } = renderHook(() => useOrientation())
      
      // Verify event listeners were added
      expect(mockAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      
      // Unmount and verify cleanup
      unmount()
      expect(mockRemoveEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
    })
  })

  describe('useOrientationAwareMobile', () => {
    it('should detect mobile in portrait mode', () => {
      // Set mobile portrait dimensions
      Object.defineProperty(window, 'innerWidth', { value: 375 })
      Object.defineProperty(window, 'innerHeight', { value: 667 })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('portrait')
    })

    it('should detect mobile in landscape mode', () => {
      // Set mobile landscape dimensions
      Object.defineProperty(window, 'innerWidth', { value: 667 })
      Object.defineProperty(window, 'innerHeight', { value: 375 })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('landscape')
    })

    it('should detect desktop correctly', () => {
      // Set desktop dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1200 })
      Object.defineProperty(window, 'innerHeight', { value: 800 })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.isMobile).toBe(false)
      expect(result.current.orientation).toBe('landscape')
    })

    it('should handle tablet in landscape as mobile', () => {
      // Set tablet landscape dimensions (should still be mobile due to smaller dimension check)
      Object.defineProperty(window, 'innerWidth', { value: 1024 })
      Object.defineProperty(window, 'innerHeight', { value: 600 })
      
      const { result } = renderHook(() => useOrientationAwareMobile())
      
      // Should be mobile because min(1024, 600) = 600 < 768
      expect(result.current.isMobile).toBe(true)
      expect(result.current.orientation).toBe('landscape')
    })
  })

  describe('Orientation Change Scenarios', () => {
    it('should handle phone rotation from portrait to landscape', async () => {
      // Start in portrait
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true })
      
      const { result, rerender } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.isMobile).toBe(true)
      
      // Rotate to landscape
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true })
        Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true })
      })
      
      // Re-render to trigger the effect
      rerender()
      
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.isMobile).toBe(true) // Should still be mobile
    })

    it('should handle tablet rotation correctly', () => {
      // Start in portrait
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 1024, configurable: true })
      
      const { result, rerender } = renderHook(() => useOrientationAwareMobile())
      
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.isMobile).toBe(false) // 768px is the breakpoint
      
      // Rotate to landscape
      act(() => {
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
        Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true })
      })
      
      // Re-render to trigger the effect
      rerender()
      
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.isMobile).toBe(false) // min(1024, 768) = 768, which is not < 768
    })
  })
})