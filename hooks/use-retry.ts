import { useState, useCallback, useRef } from 'react';

export interface RetryConfig {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface RetryState {
  isRetrying: boolean;
  attemptCount: number;
  lastError: Error | null;
  nextRetryIn: number;
}

export interface UseRetryReturn {
  retry: <T>(fn: () => Promise<T>, config?: RetryConfig) => Promise<T>;
  state: RetryState;
  cancel: () => void;
  reset: () => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: Error) => {
    const message = error.message.toLowerCase();
    // Retry on network errors, timeouts, and server errors
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    );
  }
};

/**
 * Custom hook for implementing retry logic with exponential backoff
 * Provides configurable retry mechanisms for async operations
 */
export function useRetry(): UseRetryReturn {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attemptCount: 0,
    lastError: null,
    nextRetryIn: 0
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const calculateDelay = useCallback((attempt: number, config: Required<RetryConfig>): number => {
    const delay = Math.min(
      config.baseDelay * Math.pow(config.backoffFactor, attempt),
      config.maxDelay
    );
    // Add some jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  }, []);

  const startCountdown = useCallback((delayMs: number) => {
    let remaining = Math.ceil(delayMs / 1000);
    setState(prev => ({ ...prev, nextRetryIn: remaining }));

    const updateCountdown = () => {
      remaining -= 1;
      if (remaining > 0) {
        setState(prev => ({ ...prev, nextRetryIn: remaining }));
        countdownRef.current = setTimeout(updateCountdown, 1000);
      } else {
        setState(prev => ({ ...prev, nextRetryIn: 0 }));
      }
    };

    if (remaining > 0) {
      countdownRef.current = setTimeout(updateCountdown, 1000);
    }
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearTimeout(countdownRef.current);
      countdownRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: 0
    }));
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null,
      nextRetryIn: 0
    });
  }, [cancel]);

  const retry = useCallback(async <T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error;

    // Reset state at the beginning
    setState({
      isRetrying: false,
      attemptCount: 0,
      lastError: null,
      nextRetryIn: 0
    });

    for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
      try {
        setState(prev => ({
          ...prev,
          attemptCount: attempt + 1,
          isRetrying: attempt > 0
        }));

        const result = await fn();
        
        // Success - reset state and return result
        setState({
          isRetrying: false,
          attemptCount: 0,
          lastError: null,
          nextRetryIn: 0
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        setState(prev => ({
          ...prev,
          lastError: lastError
        }));

        // Check if we should retry this error
        if (!finalConfig.retryCondition(lastError)) {
          throw lastError;
        }

        // If this is the last attempt, don't wait
        if (attempt === finalConfig.maxAttempts - 1) {
          break;
        }

        // Calculate delay and wait before next attempt
        const delay = calculateDelay(attempt, finalConfig);
        
        setState(prev => ({
          ...prev,
          isRetrying: true
        }));

        // Start countdown
        startCountdown(delay);

        // Wait for the delay
        await new Promise((resolve, reject) => {
          timeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }

    // All attempts failed
    setState(prev => ({
      ...prev,
      isRetrying: false,
      nextRetryIn: 0
    }));

    throw lastError!;
  }, [calculateDelay, startCountdown]);

  return {
    retry,
    state,
    cancel,
    reset
  };
}