import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetry, useApiRetry, useExponentialRetry } from '@/hooks/use-retry';

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute function successfully on first try', async () => {
    const mockFunction = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useRetry(mockFunction));

    await act(async () => {
      const response = await result.current.execute();
      expect(response).toBe('success');
    });

    expect(mockFunction).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.attempt).toBe(1);
  });

  it('should retry on failure with exponential backoff', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => 
      useRetry(mockFunction, {
        maxAttempts: 3,
        delay: 1000,
        backoffMultiplier: 2,
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // Fast-forward through delays
    await act(async () => {
      jest.advanceTimersByTime(1000); // First retry delay
    });

    await act(async () => {
      jest.advanceTimersByTime(2000); // Second retry delay (doubled)
    });

    const response = await executePromise;

    expect(response).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
    expect(result.current.error).toBeNull();
    expect(result.current.attempt).toBe(3);
  });

  it('should fail after max attempts', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Persistent failure'));
    const onMaxAttemptsReached = jest.fn();

    const { result } = renderHook(() => 
      useRetry(mockFunction, {
        maxAttempts: 2,
        delay: 100,
        onMaxAttemptsReached,
      })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Persistent failure');
      }
    });

    // Fast-forward through delay
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(mockFunction).toHaveBeenCalledTimes(2);
    expect(result.current.canRetry).toBe(false);
    expect(onMaxAttemptsReached).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should call onRetry callback', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce('success');
    
    const onRetry = jest.fn();

    const { result } = renderHook(() => 
      useRetry(mockFunction, {
        maxAttempts: 2,
        delay: 100,
        onRetry,
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await executePromise;

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should respect max delay', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => 
      useRetry(mockFunction, {
        maxAttempts: 3,
        delay: 1000,
        backoffMultiplier: 10, // Would normally create very long delays
        maxDelay: 2000, // But capped at 2 seconds
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // First retry should use original delay
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Second retry should be capped at maxDelay
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const response = await executePromise;
    expect(response).toBe('success');
  });

  it('should allow cancellation', async () => {
    const mockFunction = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 5000))
    );

    const { result } = renderHook(() => useRetry(mockFunction));

    act(() => {
      result.current.execute();
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.canRetry).toBe(true);
  });

  it('should allow reset', async () => {
    const mockFunction = jest.fn().mockRejectedValue(new Error('Failure'));

    const { result } = renderHook(() => 
      useRetry(mockFunction, { maxAttempts: 1 })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.canRetry).toBe(false);
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.canRetry).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.attempt).toBe(0);
  });
});

describe('useApiRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should use API-specific default options', () => {
    const mockApiFunction = jest.fn().mockResolvedValue('success');
    
    const { result } = renderHook(() => useApiRetry(mockApiFunction));

    // Should have API-specific defaults
    expect(result.current).toHaveProperty('execute');
    expect(result.current).toHaveProperty('retry');
    expect(result.current).toHaveProperty('cancel');
    expect(result.current).toHaveProperty('reset');
  });

  it('should log retry attempts', async () => {
    const mockApiFunction = jest.fn()
      .mockRejectedValueOnce(new Error('API failure'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => 
      useApiRetry(mockApiFunction, { delay: 100 })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    await executePromise;

    expect(console.warn).toHaveBeenCalledWith(
      'API call failed (attempt 1):',
      'API failure'
    );
  });

  it('should log max attempts reached', async () => {
    const mockApiFunction = jest.fn().mockRejectedValue(new Error('Persistent API failure'));

    const { result } = renderHook(() => 
      useApiRetry(mockApiFunction, { maxAttempts: 2, delay: 100 })
    );

    await act(async () => {
      try {
        await result.current.execute();
      } catch (error) {
        // Expected to fail
      }
    });

    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(console.error).toHaveBeenCalledWith(
      'API call failed after all retry attempts:',
      expect.any(Error)
    );
  });
});

describe('useExponentialRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should use exponential backoff by default', async () => {
    const mockFunction = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce('success');

    const { result } = renderHook(() => 
      useExponentialRetry(mockFunction, {
        maxAttempts: 3,
        delay: 1000,
      })
    );

    const executePromise = act(async () => {
      return result.current.execute();
    });

    // First retry: 1000ms
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    // Second retry: 2000ms (doubled)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const response = await executePromise;
    expect(response).toBe('success');
    expect(mockFunction).toHaveBeenCalledTimes(3);
  });
});