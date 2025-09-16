/**
 * Error handling utilities for mention suggestion system
 * Provides comprehensive error management, logging, and recovery mechanisms
 */

export enum MentionSuggestionErrorType {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  FILTER_ERROR = 'FILTER_ERROR',
  RENDER_ERROR = 'RENDER_ERROR',
  POSITION_ERROR = 'POSITION_ERROR',
  KEYBOARD_NAVIGATION_ERROR = 'KEYBOARD_NAVIGATION_ERROR',
  POPUP_CREATION_ERROR = 'POPUP_CREATION_ERROR',
  COMPONENT_MOUNT_ERROR = 'COMPONENT_MOUNT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface MentionSuggestionError {
  type: MentionSuggestionErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: string;
  errorId: string;
  recoverable: boolean;
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackToBasicMode?: boolean;
  suppressUserNotification?: boolean;
}

/**
 * Creates a standardized mention suggestion error object
 */
export function createMentionSuggestionError(
  type: MentionSuggestionErrorType,
  message: string,
  originalError?: Error,
  context?: Record<string, any>
): MentionSuggestionError {
  return {
    type,
    message,
    originalError,
    context: {
      ...context,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    },
    timestamp: new Date().toISOString(),
    errorId: `mention-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recoverable: isRecoverableError(type),
  };
}

/**
 * Determines if an error type is recoverable
 */
function isRecoverableError(type: MentionSuggestionErrorType): boolean {
  const recoverableTypes = [
    MentionSuggestionErrorType.FILTER_ERROR,
    MentionSuggestionErrorType.POSITION_ERROR,
    MentionSuggestionErrorType.KEYBOARD_NAVIGATION_ERROR,
    MentionSuggestionErrorType.POPUP_CREATION_ERROR,
  ];
  
  return recoverableTypes.includes(type);
}

/**
 * Logs mention suggestion errors with appropriate detail level
 */
export function logMentionSuggestionError(error: MentionSuggestionError): void {
  const logData = {
    errorId: error.errorId,
    type: error.type,
    message: error.message,
    timestamp: error.timestamp,
    recoverable: error.recoverable,
    context: error.context,
    stack: error.originalError?.stack,
  };

  // Always log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔴 Mention Suggestion Error: ${error.type}`);
    console.error('Error Details:', logData);
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.groupEnd();
  } else {
    // In production, log with less detail
    console.error('Mention Suggestion Error:', {
      errorId: error.errorId,
      type: error.type,
      message: error.message,
      recoverable: error.recoverable,
    });
  }

  // Send to error reporting service in production
  if (process.env.NODE_ENV === 'production') {
    // Example integration with error reporting service
    try {
      // Replace with your error reporting service
      // Sentry.captureException(error.originalError || new Error(error.message), {
      //   tags: { component: 'mention-suggestion', type: error.type },
      //   extra: logData,
      // });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
}

/**
 * Safe wrapper for mention suggestion operations with error handling
 */
export async function safeExecute<T>(
  operation: () => T | Promise<T>,
  errorType: MentionSuggestionErrorType,
  context?: Record<string, any>,
  options: ErrorRecoveryOptions = {}
): Promise<{ success: boolean; result?: T; error?: MentionSuggestionError }> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, result };
    } catch (originalError) {
      const error = createMentionSuggestionError(
        errorType,
        `Operation failed: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
        originalError instanceof Error ? originalError : undefined,
        { ...context, attempt, maxRetries }
      );

      logMentionSuggestionError(error);

      // If this is the last attempt or error is not recoverable, return the error
      if (attempt === maxRetries || !error.recoverable) {
        return { success: false, error };
      }

      // Wait before retrying
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // This should never be reached, but TypeScript requires it
  const fallbackError = createMentionSuggestionError(
    errorType,
    'Maximum retries exceeded',
    undefined,
    context
  );
  return { success: false, error: fallbackError };
}

/**
 * Error handler for suggestion initialization failures
 */
export function handleSuggestionInitializationError(
  error: Error,
  context?: Record<string, any>
): MentionSuggestionError {
  const suggestionError = createMentionSuggestionError(
    MentionSuggestionErrorType.INITIALIZATION_FAILED,
    'Failed to initialize mention suggestion system',
    error,
    context
  );

  logMentionSuggestionError(suggestionError);
  return suggestionError;
}

/**
 * Error handler for filtering operations
 */
export function handleFilterError(
  error: Error,
  query: string,
  variableCount: number
): MentionSuggestionError {
  const suggestionError = createMentionSuggestionError(
    MentionSuggestionErrorType.FILTER_ERROR,
    'Failed to filter mention variables',
    error,
    { query, variableCount }
  );

  logMentionSuggestionError(suggestionError);
  return suggestionError;
}

/**
 * Error handler for rendering failures
 */
export function handleRenderError(
  error: Error,
  componentName: string,
  props?: Record<string, any>
): MentionSuggestionError {
  const suggestionError = createMentionSuggestionError(
    MentionSuggestionErrorType.RENDER_ERROR,
    `Failed to render ${componentName}`,
    error,
    { componentName, props }
  );

  logMentionSuggestionError(suggestionError);
  return suggestionError;
}

/**
 * Error handler for positioning failures
 */
export function handlePositionError(
  error: Error,
  clientRect?: DOMRect | null
): MentionSuggestionError {
  const suggestionError = createMentionSuggestionError(
    MentionSuggestionErrorType.POSITION_ERROR,
    'Failed to position suggestion popup',
    error,
    { 
      clientRect: clientRect ? {
        x: clientRect.x,
        y: clientRect.y,
        width: clientRect.width,
        height: clientRect.height,
      } : null,
      viewport: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
      } : null,
    }
  );

  logMentionSuggestionError(suggestionError);
  return suggestionError;
}

/**
 * Error handler for keyboard navigation failures
 */
export function handleKeyboardNavigationError(
  error: Error,
  keyEvent: KeyboardEvent,
  selectedIndex: number,
  itemCount: number
): MentionSuggestionError {
  const suggestionError = createMentionSuggestionError(
    MentionSuggestionErrorType.KEYBOARD_NAVIGATION_ERROR,
    'Failed to handle keyboard navigation',
    error,
    {
      key: keyEvent.key,
      code: keyEvent.code,
      selectedIndex,
      itemCount,
      ctrlKey: keyEvent.ctrlKey,
      shiftKey: keyEvent.shiftKey,
      altKey: keyEvent.altKey,
    }
  );

  logMentionSuggestionError(suggestionError);
  return suggestionError;
}

/**
 * Graceful fallback handler that provides basic functionality when suggestions fail
 */
export function createGracefulFallback() {
  return {
    /**
     * Fallback filter function that returns empty results safely
     */
    fallbackFilter: (variables: any[], query: string) => {
      try {
        // Basic filtering without advanced features
        if (!query.trim()) return variables.slice(0, 10);
        
        return variables
          .filter(variable => 
            variable?.label?.toLowerCase().includes(query.toLowerCase()) ||
            variable?.description?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 10);
      } catch (error) {
        console.warn('Fallback filter failed, returning empty results:', error);
        return [];
      }
    },

    /**
     * Fallback suggestion handler that inserts basic @ mentions
     */
    fallbackSuggestion: (editor: any, query: string) => {
      try {
        // Insert basic @ mention without suggestion popup
        const mentionText = `@${query}`;
        editor?.chain().focus().insertContent(mentionText).run();
      } catch (error) {
        console.warn('Fallback suggestion insertion failed:', error);
      }
    },

    /**
     * Check if fallback mode should be enabled
     */
    shouldUseFallback: (errorCount: number, maxErrors: number = 3) => {
      return errorCount >= maxErrors;
    },
  };
}

/**
 * Error recovery manager for mention suggestions
 */
export class MentionSuggestionErrorRecovery {
  private errorCount = 0;
  private maxErrors = 3;
  private fallbackMode = false;
  private lastError: MentionSuggestionError | null = null;

  constructor(maxErrors = 3) {
    this.maxErrors = maxErrors;
  }

  /**
   * Record an error and determine if fallback mode should be enabled
   */
  recordError(error: MentionSuggestionError): boolean {
    this.errorCount++;
    this.lastError = error;
    
    if (this.errorCount >= this.maxErrors && !this.fallbackMode) {
      this.fallbackMode = true;
      console.warn('Mention suggestion system entering fallback mode due to repeated errors');
      return true;
    }
    
    return false;
  }

  /**
   * Reset error count and exit fallback mode
   */
  reset(): void {
    this.errorCount = 0;
    this.fallbackMode = false;
    this.lastError = null;
  }

  /**
   * Check if system is in fallback mode
   */
  isInFallbackMode(): boolean {
    return this.fallbackMode;
  }

  /**
   * Get current error statistics
   */
  getErrorStats() {
    return {
      errorCount: this.errorCount,
      maxErrors: this.maxErrors,
      fallbackMode: this.fallbackMode,
      lastError: this.lastError,
    };
  }
}

/**
 * Global error recovery instance for mention suggestions
 */
export const mentionSuggestionErrorRecovery = new MentionSuggestionErrorRecovery();