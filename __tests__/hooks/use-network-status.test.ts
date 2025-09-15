import { renderHook, act, waitFor } from '@testing-library/react';
import { useNetworkStatus } from '@/hooks/use-network-status';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock navigator.connection
Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Mock fetch for connectivity checks
global.fetch = jest.fn();

// Mock window event listeners
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener
});

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigator.onLine = true;
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with correct online status', () => {
    navigator.onLine = true;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
  });

  it('should initialize with correct offline status', () => {
    navigator.onLine = false;
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
  });

  it('should set up event listeners for online/offline events', () => {
    renderHook(() => useNetworkStatus());

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update status when going offline', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Simulate going offline
    act(() => {
      navigator.onLine = false;
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];
      if (offlineHandler) offlineHandler();
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.isOffline).toBe(true);
    expect(result.current.lastOfflineTime).toBeInstanceOf(Date);
  });

  it('should update status when coming back online', () => {
    navigator.onLine = false;
    const { result } = renderHook(() => useNetworkStatus());

    // Simulate coming back online
    act(() => {
      navigator.onLine = true;
      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];
      if (onlineHandler) onlineHandler();
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);
    expect(result.current.lastOnlineTime).toBeInstanceOf(Date);
  });

  it('should provide connection information when available', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.connectionType).toBe('wifi');
    expect(result.current.effectiveType).toBe('4g');
    expect(result.current.downlink).toBe(10);
    expect(result.current.rtt).toBe(50);
  });

  it('should check actual connectivity with API call', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValueOnce({
      ok: true
    } as Response);

    const { result } = renderHook(() => useNetworkStatus());

    const isConnected = await result.current.checkConnectivity();

    expect(isConnected).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith('/api/health', {
      method: 'HEAD',
      signal: expect.any(AbortSignal),
      cache: 'no-cache'
    });
  });

  it('should detect connectivity issues even when navigator.onLine is true', async () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useNetworkStatus());

    const isConnected = await result.current.checkConnectivity();

    expect(isConnected).toBe(false);
    expect(result.current.isOnline).toBe(true); // navigator.onLine can be misleading
  });

  it('should timeout connectivity checks after 5 seconds', async () => {
    jest.useFakeTimers();
    
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    let abortController: AbortController;
    
    mockFetch.mockImplementation((_url, options) => {
      abortController = (options as any)?.signal?.constructor === AbortSignal ? 
        { abort: jest.fn() } as any : new AbortController();
      
      return new Promise((resolve, reject) => {
        // Simulate abort after timeout
        setTimeout(() => {
          reject(new Error('Request aborted'));
        }, 6000);
      });
    });

    const { result } = renderHook(() => useNetworkStatus());

    const connectivityPromise = result.current.checkConnectivity();

    // Fast-forward time to trigger timeout
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    const isConnected = await connectivityPromise;

    expect(isConnected).toBe(false);
    
    jest.useRealTimers();
  }, 10000);

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should handle connection change events when supported', () => {
    const mockConnection = {
      type: 'cellular',
      effectiveType: '3g',
      downlink: 5,
      rtt: 100,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Only redefine if not already defined or if configurable
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'connection');
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        configurable: true,
        writable: true
      });
    }

    const { result } = renderHook(() => useNetworkStatus());

    expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    // Simulate connection change
    act(() => {
      mockConnection.type = 'wifi';
      mockConnection.effectiveType = '4g';
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )?.[1];
      if (changeHandler) changeHandler();
    });

    expect(result.current.connectionType).toBe('wifi');
    expect(result.current.effectiveType).toBe('4g');
  });

  it('should work in SSR environment', () => {
    // Mock SSR environment
    const originalWindow = global.window;
    delete (global as any).window;

    const { result } = renderHook(() => useNetworkStatus());

    // Should default to online in SSR
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOffline).toBe(false);

    // Restore window
    global.window = originalWindow;
  });
});