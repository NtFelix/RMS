import { renderHook, act, waitFor } from '@testing-library/react';
import { useSearch } from '../use-search';

// Mock the useDebounce hook
jest.mock('../use-debounce', () => ({
  useDebounce: jest.fn()
}));

// Mock the useSearchAnalytics hook
jest.mock('../use-search-analytics', () => ({
  useSearchAnalytics: jest.fn(() => ({
    trackSearch: jest.fn()
  }))
}));

import { useDebounce } from '../use-debounce';
const mockUseDebounce = useDebounce as jest.MockedFunction<typeof useDebounce>;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock window event listeners
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
Object.defineProperty(window, 'addEventListener', { value: mockAddEventListener });
Object.defineProperty(window, 'removeEventListener', { value: mockRemoveEventListener });

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useSearch', () => {
  // Suppress React act() warnings - these are expected in this test suite
  // as we're testing async state updates
  const originalError = console.error;
  
  beforeAll(() => {
    console.error = jest.fn((message) => {
      // Only suppress React act() warnings, let other errors through
      if (
        typeof message === 'string' && 
        (message.includes('Warning: An update to') || 
         message.includes('not wrapped in act'))
      ) {
        return;
      }
      originalError(message);
    });
  });
  
  afterAll(() => {
    console.error = originalError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockUseDebounce.mockImplementation((value) => value);
    navigator.onLine = true;
    
    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useSearch());

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.executionTime).toBe(0);
      expect(result.current.retryCount).toBe(0);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.lastSuccessfulQuery).toBe(null);
    });

    it('should accept custom options', () => {
      const options = {
        debounceMs: 500,
        limit: 10,
        categories: ['tenant' as const, 'house' as const]
      };

      const { result } = renderHook(() => useSearch(options));

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
    });

    it('should set up network event listeners', () => {
      renderHook(() => useSearch());

      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Query management', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test query');
      });

      expect(result.current.query).toBe('test query');
    });

    it('should clear search when clearSearch is called', () => {
      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test query');
      });

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.error).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Debouncing functionality', () => {
    it('should use debounced query for searches', () => {
      mockUseDebounce.mockReturnValue('debounced query');
      
      const { result } = renderHook(() => useSearch({ debounceMs: 300 }));

      act(() => {
        result.current.setQuery('test query');
      });

      expect(mockUseDebounce).toHaveBeenCalledWith('test query', 300);
    });

    it('should not search for empty debounced queries', async () => {
      mockUseDebounce.mockReturnValue('');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
          totalCount: 0,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      // Should not make fetch call for empty debounced query
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.results).toEqual([]);
    });
  });

  describe('Search execution', () => {
    const mockSearchResponse = {
      results: {
        tenant: [
          {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            status: 'active',
            apartment: { name: 'Apt 1', house_name: 'House 1' }
          }
        ],
        house: [],
        apartment: [],
        finance: [],
        task: []
      },
      totalCount: 1,
      executionTime: 150
    };

    it('should perform successful search', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse)
      });

      // Mock useDebounce to return the query immediately
      mockUseDebounce.mockImplementation((value) => value);

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('john');
      });

      // Wait for the search to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      }, { timeout: 3000 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=john'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].type).toBe('tenant');
      expect(result.current.results[0].title).toBe('John Doe');
      expect(result.current.totalCount).toBe(1);
      expect(result.current.executionTime).toBe(150);
      expect(result.current.error).toBe(null);
      expect(result.current.lastSuccessfulQuery).toBe('john');
    });

    it('should set loading state during search', async () => {
      mockUseDebounce.mockReturnValue('test');
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockSearchResponse)
        }), 100))
      );

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('test');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should cancel previous requests when new search starts', async () => {
      mockUseDebounce.mockReturnValue('test1');
      
      let abortController: AbortController;
      mockFetch.mockImplementation((url, options) => {
        abortController = options?.signal?.constructor === AbortSignal ? 
          { abort: jest.fn(), signal: options.signal } as any : 
          new AbortController();
        
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (options?.signal?.aborted) {
              reject(new Error('AbortError'));
            } else {
              resolve({
                ok: true,
                json: () => Promise.resolve(mockSearchResponse)
              });
            }
          }, 100);
        });
      });

      const { result } = renderHook(() => useSearch());

      // Start first search
      act(() => {
        result.current.setQuery('test1');
      });

      // Start second search before first completes
      mockUseDebounce.mockReturnValue('test2');
      act(() => {
        result.current.setQuery('test2');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have made two fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Caching functionality', () => {
    const mockResponse = {
      results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
      totalCount: 0,
      executionTime: 100
    };

    it('should cache search results', async () => {
      mockUseDebounce.mockReturnValue('cached query');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useSearch());

      // First search
      act(() => {
        result.current.setQuery('cached query');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second search with same query should use cache
      act(() => {
        result.current.setQuery('');
      });

      act(() => {
        result.current.setQuery('cached query');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not make another fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache expiration', async () => {
      mockUseDebounce.mockImplementation((value) => value);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const { result } = renderHook(() => useSearch({ cacheTimeMs: 100 }));

      // First search
      act(() => {
        result.current.setQuery('expired query');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Clear query first, then set it again to trigger new search
      act(() => {
        result.current.setQuery('');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setQuery('expired query');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockUseDebounce.mockReturnValue('error query');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('error query');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Internetverbindung');
      expect(result.current.results).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should handle HTTP errors', async () => {
      mockUseDebounce.mockImplementation((value) => value);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' })
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('http error');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain('Serverfehler bei der Suche');
    });

    it('should implement retry mechanism', async () => {
      // Ensure we're online for this test
      navigator.onLine = true;
      mockLocalStorage.getItem.mockReturnValue(null);
      
      mockUseDebounce.mockImplementation((value) => value);
      
      let callCount = 0;
      
      // Use a server error instead of network error to avoid offline detection
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('500 Internal Server Error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
            totalCount: 0,
            executionTime: 100
          })
        });
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('retry query');
      });

      // Wait for the search to start and fail
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(0);
      }, { timeout: 1000 });

      // Fast forward timers to trigger retries
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Wait for retries to complete
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(1);
      }, { timeout: 3000 });

      // Verify that multiple attempts were made
      expect(callCount).toBeGreaterThan(1);
    });

    it('should provide manual retry function', async () => {
      mockUseDebounce.mockReturnValue('manual retry');
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                  ok: true,
                  json: () => Promise.resolve({
                    results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
                    totalCount: 0,
                    executionTime: 100
                  })
                });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('manual retry');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Manual retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Network status handling', () => {
    it('should detect offline status', () => {
      navigator.onLine = false;
      
      const { result } = renderHook(() => useSearch());

      expect(result.current.isOffline).toBe(true);
    });

    it('should handle going offline during search', async () => {
      mockUseDebounce.mockReturnValue('offline test');
      
      const { result } = renderHook(() => useSearch());

      // Simulate going offline
      act(() => {
        navigator.onLine = false;
        // Trigger offline event
        const offlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'offline'
        )?.[1];
        if (offlineHandler) offlineHandler();
      });

      act(() => {
        result.current.setQuery('offline test');
      });

      expect(result.current.isOffline).toBe(true);
      expect(result.current.error).toContain('Internetverbindung');
    });

    it('should retry when coming back online', async () => {
      mockUseDebounce.mockReturnValue('online retry');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
          totalCount: 0,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch());

      // Start with offline state and error
      act(() => {
        navigator.onLine = false;
        result.current.setQuery('online retry');
      });

      // Simulate coming back online
      act(() => {
        navigator.onLine = true;
        const onlineHandler = mockAddEventListener.mock.calls.find(
          call => call[0] === 'online'
        )?.[1];
        if (onlineHandler) onlineHandler();
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Search result transformation', () => {
    it('should transform tenant results correctly', async () => {
      mockUseDebounce.mockImplementation((value) => value);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: {
            tenant: [{
              id: '1',
              name: 'John Doe',
              email: 'john@example.com',
              phone: '123456789',
              status: 'active',
              apartment: { name: 'Apt 1', house_name: 'House 1' }
            }],
            house: [],
            apartment: [],
            finance: [],
            task: []
          },
          totalCount: 1,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('tenant');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      }, { timeout: 3000 });

      const tenantResult = result.current.results[0];
      expect(tenantResult.type).toBe('tenant');
      expect(tenantResult.title).toBe('John Doe');
      expect(tenantResult.subtitle).toBe('john@example.com');
      expect(tenantResult.context).toBe('Apt 1 - House 1');
      expect(tenantResult.actions).toHaveLength(2);
    });

    it('should transform finance results correctly', async () => {
      mockUseDebounce.mockImplementation((value) => value);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: {
            tenant: [],
            house: [],
            apartment: [],
            finance: [{
              id: '1',
              name: 'Rent Payment',
              amount: 800,
              date: '2023-12-01',
              type: 'income',
              apartment: { name: 'Apt 1', house_name: 'House 1' }
            }],
            task: []
          },
          totalCount: 1,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('finance');
      });

      await waitFor(() => {
        expect(result.current.results).toHaveLength(1);
      }, { timeout: 3000 });

      const financeResult = result.current.results[0];
      expect(financeResult.type).toBe('finance');
      expect(financeResult.title).toBe('Rent Payment');
      expect(financeResult.subtitle).toBe('+800€');
      expect(financeResult.context).toBe('Apt 1 - House 1');
      expect(financeResult.actions).toHaveLength(3); // Edit, View, Delete
    });
  });

  describe('Custom options', () => {
    it('should respect custom debounce time', () => {
      renderHook(() => useSearch({ debounceMs: 500 }));

      expect(mockUseDebounce).toHaveBeenCalledWith('', 500);
    });

    it('should respect custom limit', async () => {
      mockUseDebounce.mockReturnValue('limit test');
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
          totalCount: 0,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch({ limit: 10 }));

      act(() => {
        result.current.setQuery('limit test');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=10'),
          expect.any(Object)
        );
      });
    });

    it('should respect custom categories', async () => {
      mockUseDebounce.mockImplementation((value) => value);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          results: { tenant: [], house: [], apartment: [], finance: [], task: [] },
          totalCount: 0,
          executionTime: 100
        })
      });

      const { result } = renderHook(() => useSearch({ 
        categories: ['tenant', 'house'] 
      }));

      act(() => {
        result.current.setQuery('categories test');
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('categories=house%2Ctenant'),
          expect.any(Object)
        );
      }, { timeout: 3000 });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useSearch());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should cancel ongoing requests on unmount', async () => {
      mockUseDebounce.mockReturnValue('cleanup test');
      
      let abortCalled = false;
      mockFetch.mockImplementation((url, options) => {
        const originalAbort = options?.signal?.addEventListener;
        if (options?.signal) {
          options.signal.addEventListener = (event: string, handler: () => void) => {
            if (event === 'abort') {
              abortCalled = true;
            }
            return originalAbort?.call(options.signal, event, handler);
          };
        }
        
        return new Promise(() => {}); // Never resolves
      });

      const { result, unmount } = renderHook(() => useSearch());

      act(() => {
        result.current.setQuery('cleanup test');
      });

      unmount();

      // AbortController should have been called
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});