'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

/**
 * Error boundary specifically designed for mention suggestion components
 * Provides graceful fallback UI and error reporting without disrupting editor flow
 */
export class MentionSuggestionErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate unique error ID for tracking
    const errorId = `mention-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    this.logError(error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      retryCount: this.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Log to console for development
    console.error('Mention Suggestion Error:', errorDetails);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorDetails });
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorId: '',
      });
    }
  };

  private handleDismiss = () => {
    // Reset error state to hide the error UI
    this.setState({
      hasError: false,
      error: null,
      errorId: '',
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - minimal and non-disruptive
      return (
        <div
          className={cn(
            'mention-suggestion-error',
            'bg-destructive/10 border border-destructive/20 rounded-md p-3',
            'text-sm text-destructive-foreground'
          )}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium">Suggestion Error</div>
              <div className="text-xs text-muted-foreground mt-1">
                Unable to load variable suggestions. You can continue typing normally.
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs hover:underline">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-20">
                    {this.state.error?.message}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex items-center gap-1">
              {this.retryCount < this.maxRetries && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={this.handleRetry}
                  className="h-6 px-2 text-xs"
                  aria-label="Retry loading suggestions"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={this.handleDismiss}
                className="h-6 px-2 text-xs"
                aria-label="Dismiss error message"
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Provides error state management and recovery mechanisms
 */
export function useMentionSuggestionErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 3;

  const handleError = React.useCallback((error: Error) => {
    console.error('Mention Suggestion Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      retryCount,
    });
    
    setError(error);
  }, [retryCount]);

  const retry = React.useCallback(() => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setError(null);
    }
  }, [retryCount, maxRetries]);

  const reset = React.useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const canRetry = retryCount < maxRetries;

  return {
    error,
    hasError: error !== null,
    canRetry,
    retryCount,
    handleError,
    retry,
    reset,
  };
}

/**
 * Minimal error fallback component for suggestion failures
 * Designed to be non-disruptive to the editor experience
 */
export function MentionSuggestionErrorFallback({ 
  error, 
  onRetry, 
  onDismiss,
  canRetry = true 
}: {
  error?: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  canRetry?: boolean;
}) {
  return (
    <div
      className="mention-suggestion-error-fallback bg-muted/50 border border-border rounded-md p-2 text-xs text-muted-foreground"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span>Suggestions unavailable</span>
        <div className="flex items-center gap-1">
          {canRetry && onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-5 px-1 text-xs"
            >
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-5 px-1 text-xs"
            >
              ×
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}