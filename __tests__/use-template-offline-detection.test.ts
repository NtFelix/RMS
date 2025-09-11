import { renderHook, act, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { useTemplateOfflineDetection } from '@/hooks/use-template-offline-detection'

// Mock toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({ toast: mockToast }))
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  configurable: true,
  writable: true,
  value: true,
})

// Mock window event listeners
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()
Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
})
Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
})

describe('useTemplateOfflineDetection', () => {
  beforeEach(() => {
    mockToast.mockClear()
    mockFetch.mockClear()
    mockAddEventListener.mockClear()
    mockRemoveEventListener.mockClear()
    navigator.onLine = true
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('sets up event listeners on mount', () => {
      renderHook(() => useTemplateOfflineDetection())

      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('cleans up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useTemplateOfflineDetection())

      unmount()

      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('initializes with correct online status', () => {
      navigator.onLine = false
      const { result } = renderHook(() => useTemplateOfflineDetection())

      expect(result.current.isOffline).toBe(true)
    })

    it('initializes with online status when navigator.onLine is true', () => {
      navigator.onLine = true
      const { result } = renderHook(() => useTemplateOfflineDetection())

      expect(result.current.isOffline).toBe(false)
    })
  })

  describe('Offline Detection', () => {
    it('detects when going offline', () => {
      const { result } = renderHook(() => useTemplateOfflineDetection())

      // Simulate going offline
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      expect(result.current.isOffline).toBe(true)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Verbindung unterbrochen',
          variant: 'destructive'
        })
      )
    })

    it('detects when coming back online', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      
      const { result } = renderHook(() => useTemplateOfflineDetection())

      // Start offline
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      expect(result.current.isOffline).toBe(true)

      // Come back online
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(result.current.isOffline).toBe(false)
      })

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Verbindung wiederhergestellt'
        })
      )
    })

    it('verifies connection with health check', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      
      const { result } = renderHook(() => useTemplateOfflineDetection())

      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.objectContaining({
          method: 'HEAD',
          cache: 'no-cache'
        }))
      })
    })

    it('handles failed health check', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => useTemplateOfflineDetection())

      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      // Should remain in connecting state and schedule retry
      await waitFor(() => {
        expect(result.current.isConnecting).toBe(false)
      })
    })
  })

  describe('Offline Queue', () => {
    it('queues operations when offline', () => {
      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      // Go offline
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      // Queue an operation
      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'Test Template' }
        })
      })

      expect(result.current.pendingOperationsCount).toBe(1)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Operation in Warteschlange'
        })
      )
    })

    it('does not queue operations when offline queue is disabled', () => {
      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: false
      }))

      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'Test Template' }
        })
      })

      expect(result.current.pendingOperationsCount).toBe(0)
    })

    it('processes pending operations when coming back online', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockResolvedValueOnce({ ok: true }) // Create operation

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      // Go offline and queue operation
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'Test Template' }
        })
      })

      expect(result.current.pendingOperationsCount).toBe(1)

      // Come back online
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(result.current.pendingOperationsCount).toBe(0)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/templates', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }))
    })

    it('retries failed operations up to max retries', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockRejectedValueOnce(new Error('Server error')) // First attempt fails
        .mockResolvedValueOnce({ ok: true }) // Health check for retry
        .mockResolvedValueOnce({ ok: true }) // Second attempt succeeds

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true,
        maxRetries: 2
      }))

      // Queue operation while offline
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'Test Template' }
        })
      })

      // Come back online
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      // Wait for initial processing
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2) // Health check + first attempt
      })

      // Fast-forward to retry
      act(() => {
        jest.advanceTimersByTime(4000) // 2 * retryDelay
      })

      await waitFor(() => {
        expect(result.current.pendingOperationsCount).toBe(0)
      })
    })
  })

  describe('Manual Retry', () => {
    it('allows manual connection retry', async () => {
      mockFetch.mockResolvedValue({ ok: true })
      
      const { result } = renderHook(() => useTemplateOfflineDetection())

      // Go offline
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      expect(result.current.isOffline).toBe(true)

      // Manual retry
      await act(async () => {
        await result.current.retryConnection()
      })

      expect(result.current.isOffline).toBe(false)
      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object))
    })

    it('shows error toast when manual retry fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      const { result } = renderHook(() => useTemplateOfflineDetection())

      await act(async () => {
        await result.current.retryConnection()
      })

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Verbindung fehlgeschlagen',
          variant: 'destructive'
        })
      )
    })
  })

  describe('Callbacks', () => {
    it('calls onConnectionRestored when connection is restored', async () => {
      const mockOnConnectionRestored = jest.fn()
      mockFetch.mockResolvedValue({ ok: true })
      
      renderHook(() => useTemplateOfflineDetection({
        onConnectionRestored: mockOnConnectionRestored
      }))

      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(mockOnConnectionRestored).toHaveBeenCalledTimes(1)
      })
    })

    it('calls onConnectionLost when connection is lost', () => {
      const mockOnConnectionLost = jest.fn()
      
      renderHook(() => useTemplateOfflineDetection({
        onConnectionLost: mockOnConnectionLost
      }))

      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      expect(mockOnConnectionLost).toHaveBeenCalledTimes(1)
    })
  })

  describe('Statistics and Utilities', () => {
    it('provides offline statistics', () => {
      const { result } = renderHook(() => useTemplateOfflineDetection())

      const stats = result.current.getOfflineStats()
      
      expect(stats).toEqual({
        pendingOperationsCount: 0,
        lastOnlineTime: expect.any(Date),
        isOffline: false,
        isConnecting: false
      })
    })

    it('clears pending operations', () => {
      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      // Queue an operation
      act(() => {
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1]
        if (offlineHandler) offlineHandler()
      })

      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'Test Template' }
        })
      })

      expect(result.current.pendingOperationsCount).toBe(1)

      act(() => {
        result.current.clearPendingOperations()
      })

      expect(result.current.pendingOperationsCount).toBe(0)
    })
  })

  describe('Operation Types', () => {
    it('handles create operations', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockResolvedValueOnce({ ok: true }) // Create operation

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      act(() => {
        result.current.queueOperation({
          type: 'create',
          templateData: { title: 'New Template', content: {} }
        })
      })

      // Simulate coming online to process queue
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/templates', expect.objectContaining({
          method: 'POST'
        }))
      })
    })

    it('handles update operations', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockResolvedValueOnce({ ok: true }) // Update operation

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      act(() => {
        result.current.queueOperation({
          type: 'update',
          templateData: { id: '123', title: 'Updated Template' }
        })
      })

      // Simulate coming online to process queue
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/templates/123', expect.objectContaining({
          method: 'PUT'
        }))
      })
    })

    it('handles delete operations', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // Health check
        .mockResolvedValueOnce({ ok: true }) // Delete operation

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      act(() => {
        result.current.queueOperation({
          type: 'delete',
          templateData: { id: '123' }
        })
      })

      // Simulate coming online to process queue
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/templates/123', expect.objectContaining({
          method: 'DELETE'
        }))
      })
    })
  })

  describe('Error Handling', () => {
    it('handles network timeouts gracefully', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const { result } = renderHook(() => useTemplateOfflineDetection())

      await act(async () => {
        await result.current.retryConnection()
      })

      expect(result.current.isOffline).toBe(false) // Should not change state on timeout
    })

    it('handles unknown operation types', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true }) // Health check

      const { result } = renderHook(() => useTemplateOfflineDetection({
        enableOfflineQueue: true
      }))

      act(() => {
        result.current.queueOperation({
          type: 'unknown' as any,
          templateData: { id: '123' }
        })
      })

      // Should not crash when processing unknown operation type
      act(() => {
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1]
        if (onlineHandler) onlineHandler()
      })

      // Should handle gracefully without throwing
      await waitFor(() => {
        expect(result.current.pendingOperationsCount).toBe(0)
      })
    })
  })
})