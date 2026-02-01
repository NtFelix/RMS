/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  MentionSuggestionErrorBoundary,
  useMentionSuggestionErrorHandler,
  MentionSuggestionErrorFallback 
} from '@/components/ai/mention-suggestion-error-boundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Test component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Test component using the error handler hook
const TestHookComponent = () => {
  const { error, hasError, handleError, retry, reset, canRetry } = useMentionSuggestionErrorHandler();

  return (
    <div>
      <div data-testid="error-state">{hasError ? 'Has Error' : 'No Error'}</div>
      <div data-testid="can-retry">{canRetry ? 'Can Retry' : 'Cannot Retry'}</div>
      {error && <div data-testid="error-message">{error.message}</div>}
      <button onClick={() => handleError(new Error('Test error'))}>Trigger Error</button>
      <button onClick={retry}>Retry</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};

describe('MentionSuggestionErrorBoundary', () => {
  it('should render children when no error occurs', () => {
    render(
      <MentionSuggestionErrorBoundary>
        <div>Test content</div>
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <MentionSuggestionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.getByText('Suggestion Error')).toBeInTheDocument();
    expect(screen.getByText('Unable to load variable suggestions. You can continue typing normally.')).toBeInTheDocument();
  });

  it('should show retry button when retries are available', () => {
    render(
      <MentionSuggestionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <MentionSuggestionErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error fallback</div>;

    render(
      <MentionSuggestionErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });

    render(
      <MentionSuggestionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
  });

  it('should hide error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

    render(
      <MentionSuggestionErrorBoundary>
        <ThrowError shouldThrow={true} />
      </MentionSuggestionErrorBoundary>
    );

    expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
  });
});

describe('useMentionSuggestionErrorHandler', () => {
  it('should initialize with no error state', () => {
    render(<TestHookComponent />);

    expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
    expect(screen.getByTestId('can-retry')).toHaveTextContent('Can Retry');
  });

  it('should handle error correctly', () => {
    render(<TestHookComponent />);

    fireEvent.click(screen.getByText('Trigger Error'));

    expect(screen.getByTestId('error-state')).toHaveTextContent('Has Error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Test error');
  });

  it('should allow retry when under max retries', () => {
    render(<TestHookComponent />);

    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByTestId('can-retry')).toHaveTextContent('Can Retry');

    fireEvent.click(screen.getByText('Retry'));
    expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
  });

  it('should prevent retry when max retries exceeded', () => {
    render(<TestHookComponent />);

    // Trigger error multiple times to exceed max retries
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Trigger Error'));
      if (i < 3) {
        fireEvent.click(screen.getByText('Retry'));
      }
    }

    expect(screen.getByTestId('can-retry')).toHaveTextContent('Cannot Retry');
  });

  it('should reset error state completely', () => {
    render(<TestHookComponent />);

    fireEvent.click(screen.getByText('Trigger Error'));
    expect(screen.getByTestId('error-state')).toHaveTextContent('Has Error');

    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByTestId('error-state')).toHaveTextContent('No Error');
    expect(screen.getByTestId('can-retry')).toHaveTextContent('Can Retry');
  });
});

describe('MentionSuggestionErrorFallback', () => {
  it('should render basic error message', () => {
    render(<MentionSuggestionErrorFallback />);

    expect(screen.getByText('Suggestions unavailable')).toBeInTheDocument();
  });

  it('should show retry button when onRetry is provided and canRetry is true', () => {
    const onRetry = jest.fn();

    render(
      <MentionSuggestionErrorFallback 
        onRetry={onRetry} 
        canRetry={true} 
      />
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should hide retry button when canRetry is false', () => {
    const onRetry = jest.fn();

    render(
      <MentionSuggestionErrorFallback 
        onRetry={onRetry} 
        canRetry={false} 
      />
    );

    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });

  it('should show dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();

    render(
      <MentionSuggestionErrorFallback onDismiss={onDismiss} />
    );

    const dismissButton = screen.getByText('×');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', () => {
    render(<MentionSuggestionErrorFallback />);

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });
});