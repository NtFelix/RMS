import { useState, useCallback, useRef } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoffMultiplier?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxAttemptsReached?: (error: Error) => void;
}

interface RetryState {
  isLoading: boolean;
  error: Error | null;
  attempt: number;
  canRetry: boolean;
}

export function useRetry<T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 10000,
    onRetry,
    onMaxAttemptsReached,
  } = options;

  const [state, setState] = useState<RetryState>({
    isLoading: false,
    error: null,
    attempt: 0,
    canRetry: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (...args: T): Promise<R | null> => {
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      let currentAttempt = 0;
      let currentDelay = delay;

      while (currentAttempt < maxAttempts) {
        try {
          const result = await asyncFunction(...args);
          
          setState({
            isLoading: false,
            error: null,
            attempt: currentAttempt + 1,
            canRetry: true,
          });

          return result;
        } catch (error) {
          currentAttempt++;
          const isLastAttempt = currentAttempt >= maxAttempts;
          const errorObj = error instanceof Error ? error : new Error(String(error));

          if (abortControllerRef.current?.signal.aborted) {
            setState({
              isLoading: false,
              error: new Error('Request was cancelled'),
              attempt: currentAttempt,
              canRetry: false,
            });
            return null;
          }

          if (isLastAttempt) {
            setState({
              isLoading: false,
              error: errorObj,
              attempt: currentAttempt,
              canRetry: false,
            });

            if (onMaxAttemptsReached) {
              onMaxAttemptsReached(errorObj);
            }

            throw errorObj;
          }

          // Call retry callback
          if (onRetry) {
            onRetry(currentAttempt, errorObj);
          }

          setState(prev => ({
            ...prev,
            error: errorObj,
            attempt: currentAttempt,
          }));

          // Wait before retrying
          await new Promise(resolve => 
            setTimeout(resolve, Math.min(currentDelay, maxDelay))
          );

          currentDelay *= backoffMultiplier;
        }
      }

      return null;
    },
    [asyncFunction, maxAttempts, delay, backoffMultiplier, maxDelay, onRetry, onMaxAttemptsReached]
  );

  const retry = useCallback(() => {
    if (state.canRetry && !state.isLoading) {
      setState(prev => ({
        ...prev,
        canRetry: true,
        error: null,
        attempt: 0,
      }));
    }
  }, [state.canRetry, state.isLoading]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({
      ...prev,
      isLoading: false,
      canRetry: true,
    }));
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      isLoading: false,
      error: null,
      attempt: 0,
      canRetry: true,
    });
  }, []);

  return {
    execute,
    retry,
    cancel,
    reset,
    ...state,
  };
}

// Specialized hook for API calls with common retry patterns
export function useApiRetry<T extends any[], R>(
  apiFunction: (...args: T) => Promise<R>,
  options: RetryOptions = {}
) {
  const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 1.5,
    maxDelay: 5000,
    onRetry: (attempt, error) => {
      console.warn(`API call failed (attempt ${attempt}):`, error.message);
    },
    onMaxAttemptsReached: (error) => {
      console.error('API call failed after all retry attempts:', error);
    },
    ...options,
  };

  return useRetry(apiFunction, defaultOptions);
}

// Hook for retrying with exponential backoff
export function useExponentialRetry<T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  options: Omit<RetryOptions, 'backoffMultiplier'> = {}
) {
  return useRetry(asyncFunction, {
    ...options,
    backoffMultiplier: 2,
  });
}