import { renderHook, act, waitFor } from '@testing-library/react';
import { useRetry } from '@/hooks/use-retry';

describe('useRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt when function succeeds', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn().mockResolvedValue('success');

    const promise = result.current.retry(mockFn);
    
    const resultValue = await promise;

    expect(resultValue).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.isRetrying).toBe(false);
  });

  it('should retry on retryable errors', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');

    const promise = result.current.retry(mockFn, { maxAttempts: 3 });

    // Fast-forward through retry delays
    await act(async () => {
      jest.runAllTimers();
    });

    const resultValue = await promise;

    expect(resultValue).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn().mockRejectedValue(new Error('validation error'));

    const retryConfig = {
      maxAttempts: 3,
      retryCondition: (error: Error) => !error.message.includes('validation')
    };

    await expect(result.current.retry(mockFn, retryConfig)).rejects.toThrow('validation error');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxAttempts configuration', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn().mockRejectedValue(new Error('network error'));

    const promise = result.current.retry(mockFn, { maxAttempts: 2 });

    await act(async () => {
      jest.runAllTimers();
    });

    await expect(promise).rejects.toThrow('network error');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should implement exponential backoff', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const startTime = Date.now();
    const promise = result.current.retry(mockFn, {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffFactor: 2
    });

    // Fast-forward through delays
    await act(async () => {
      jest.runAllTimers();
    });

    await promise;

    // Should have waited for delays (1000ms + 2000ms + jitter)
    expect(jest.getTimerCount()).toBe(0); // All timers should be cleared
  });

  it('should update retry state correctly', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = result.current.retry(mockFn);

    // Check initial state
    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.attemptCount).toBe(1);

    // Wait for first failure and retry setup
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.state.isRetrying).toBe(true);
    expect(result.current.state.lastError).toEqual(new Error('network error'));

    // Complete the retry
    await act(async () => {
      jest.runAllTimers();
    });

    await promise;

    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.attemptCount).toBe(0);
  });

  it('should show countdown for next retry', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = result.current.retry(mockFn, { baseDelay: 5000 });

    // Wait for first failure
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.state.nextRetryIn).toBeGreaterThan(0);

    // Advance time and check countdown
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.state.nextRetryIn).toBeLessThan(5);

    // Complete the retry
    await act(async () => {
      jest.runAllTimers();
    });

    await promise;

    expect(result.current.state.nextRetryIn).toBe(0);
  });

  it('should allow cancelling retry', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn().mockRejectedValue(new Error('network error'));

    const promise = result.current.retry(mockFn);

    // Wait for first failure and retry setup
    await act(async () => {
      jest.advanceTimersByTime(100);
    });

    expect(result.current.state.isRetrying).toBe(true);

    // Cancel the retry
    act(() => {
      result.current.cancel();
    });

    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.nextRetryIn).toBe(0);

    // The promise should still reject with the original error
    await expect(promise).rejects.toThrow('network error');
  });

  it('should allow resetting state', () => {
    const { result } = renderHook(() => useRetry());

    // Set some state
    act(() => {
      result.current.retry(jest.fn().mockRejectedValue(new Error('test')));
    });

    expect(result.current.state.attemptCount).toBeGreaterThan(0);

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.state.attemptCount).toBe(0);
    expect(result.current.state.isRetrying).toBe(false);
    expect(result.current.state.lastError).toBeNull();
    expect(result.current.state.nextRetryIn).toBe(0);
  });

  it('should respect maxDelay configuration', async () => {
    const { result } = renderHook(() => useRetry());
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = result.current.retry(mockFn, {
      maxAttempts: 3,
      baseDelay: 1000,
      backoffFactor: 10, // Would normally create very long delays
      maxDelay: 2000 // But cap at 2 seconds
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await promise;

    // Should have completed without excessive delays
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should add jitter to prevent thundering herd', async () => {
    const { result } = renderHook(() => useRetry());
    
    // Mock Math.random to return predictable values
    const originalRandom = Math.random;
    Math.random = jest.fn().mockReturnValue(0.5);

    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success');

    const promise = result.current.retry(mockFn, { baseDelay: 1000 });

    await act(async () => {
      jest.runAllTimers();
    });

    await promise;

    expect(Math.random).toHaveBeenCalled();
    
    // Restore Math.random
    Math.random = originalRandom;
  });

  it('should handle custom retry conditions', async () => {
    const { result } = renderHook(() => useRetry());
    
    const customRetryCondition = (error: Error) => {
      return error.message.includes('retryable');
    };

    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('retryable error'))
      .mockRejectedValueOnce(new Error('non-retryable error'));

    // First call should retry
    const promise1 = result.current.retry(mockFn, { 
      maxAttempts: 2,
      retryCondition: customRetryCondition 
    });

    await act(async () => {
      jest.runAllTimers();
    });

    await expect(promise1).rejects.toThrow('non-retryable error');
    expect(mockFn).toHaveBeenCalledTimes(2); // Retried once

    // Reset mock
    mockFn.mockClear();
    mockFn.mockRejectedValue(new Error('non-retryable error'));

    // Second call should not retry
    await expect(
      result.current.retry(mockFn, { 
        maxAttempts: 3,
        retryCondition: customRetryCondition 
      })
    ).rejects.toThrow('non-retryable error');
    
    expect(mockFn).toHaveBeenCalledTimes(1); // No retry
  });
});