/**
 * Comprehensive error handling utilities for cloud storage
 * Provides error boundaries, retry logic, and user-friendly error messages
 */

import { toast } from '@/hooks/use-toast';

// Error types for cloud storage operations
export enum StorageErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Storage error interface
export interface StorageError {
  type: StorageErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  timestamp: Date;
  operation?: string;
  retryable: boolean;
  retryCount?: number;
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: StorageErrorType[];
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    StorageErrorType.NETWORK_ERROR,
    StorageErrorType.TIMEOUT_ERROR,
    StorageErrorType.SERVER_ERROR,
  ],
};

/**
 * Type guard to check if an error is a StorageError
 */
function isStorageError(error: any): error is StorageError {
  return error instanceof Error && 
         'type' in error && 
         'severity' in error && 
         'userMessage' in error && 
         'timestamp' in error && 
         'retryable' in error;
}

/**
 * Maps raw errors to structured StorageError objects
 */
export function mapError(error: any, operation?: string): StorageError {
  const timestamp = new Date();
  
  // Handle Supabase Storage errors
  if (error?.error) {
    const supabaseError = error.error;
    
    if (supabaseError.message?.includes('not found')) {
      return {
        type: StorageErrorType.FILE_NOT_FOUND,
        severity: ErrorSeverity.MEDIUM,
        message: supabaseError.message,
        userMessage: 'Die angeforderte Datei wurde nicht gefunden.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: false,
      };
    }
    
    if (supabaseError.message?.includes('unauthorized') || supabaseError.statusCode === 401) {
      return {
        type: StorageErrorType.AUTHENTICATION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: supabaseError.message,
        userMessage: 'Sie sind nicht berechtigt, diese Aktion auszuführen. Bitte melden Sie sich erneut an.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: false,
      };
    }
    
    if (supabaseError.message?.includes('forbidden') || supabaseError.statusCode === 403) {
      return {
        type: StorageErrorType.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: supabaseError.message,
        userMessage: 'Sie haben keine Berechtigung für diese Aktion.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: false,
      };
    }
    
    if (supabaseError.message?.includes('payload too large') || supabaseError.statusCode === 413) {
      return {
        type: StorageErrorType.FILE_TOO_LARGE,
        severity: ErrorSeverity.MEDIUM,
        message: supabaseError.message,
        userMessage: 'Die Datei ist zu groß. Maximale Dateigröße: 10 MB.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: false,
      };
    }
    
    if (supabaseError.message?.includes('quota') || supabaseError.statusCode === 507) {
      return {
        type: StorageErrorType.QUOTA_EXCEEDED,
        severity: ErrorSeverity.HIGH,
        message: supabaseError.message,
        userMessage: 'Ihr Speicherplatz ist voll. Bitte löschen Sie einige Dateien oder erweitern Sie Ihr Abonnement.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: false,
      };
    }
    
    if (supabaseError.statusCode >= 500) {
      return {
        type: StorageErrorType.SERVER_ERROR,
        severity: ErrorSeverity.HIGH,
        message: supabaseError.message,
        userMessage: 'Ein Serverfehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        code: supabaseError.statusCode,
        details: supabaseError,
        timestamp,
        operation,
        retryable: true,
      };
    }
  }
  
  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return {
      type: StorageErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Network error occurred',
      userMessage: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
      details: error,
      timestamp,
      operation,
      retryable: true,
    };
  }
  
  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return {
      type: StorageErrorType.TIMEOUT_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Operation timed out',
      userMessage: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
      details: error,
      timestamp,
      operation,
      retryable: true,
    };
  }
  
  // Handle validation errors
  if (error?.message?.includes('validation') || error?.message?.includes('invalid')) {
    return {
      type: StorageErrorType.VALIDATION_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'Die eingegebenen Daten sind ungültig. Bitte überprüfen Sie Ihre Eingabe.',
      details: error,
      timestamp,
      operation,
      retryable: false,
    };
  }
  
  // Default unknown error
  return {
    type: StorageErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: error?.message || 'An unknown error occurred',
    userMessage: 'Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    details: error,
    timestamp,
    operation,
    retryable: true,
  };
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName?: string
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: StorageError;
  
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = mapError(error, operationName);
      lastError.retryCount = attempt;
      
      // Don't retry if error is not retryable or we've reached max retries
      if (!lastError.retryable || attempt === finalConfig.maxRetries) {
        throw lastError;
      }
      
      // Don't retry if error type is not in retryable list
      if (!finalConfig.retryableErrors.includes(lastError.type)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
        finalConfig.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const finalDelay = delay + jitter;
      
      console.warn(`Retrying operation "${operationName}" in ${finalDelay}ms (attempt ${attempt + 1}/${finalConfig.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError!;
}

/**
 * Error logging utility
 */
export class ErrorLogger {
  private errors: StorageError[] = [];
  private maxErrors = 1000;
  
  log(error: StorageError): void {
    this.errors.push(error);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Log to console based on severity
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL Storage Error:', error);
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH Storage Error:', error);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM Storage Error:', error);
        break;
      case ErrorSeverity.LOW:
        console.info('LOW Storage Error:', error);
        break;
    }
    
    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(error);
    }
  }
  
  private sendToExternalLogger(error: StorageError): void {
    // Implementation for external logging service (e.g., Sentry, LogRocket)
    // This would be configured based on the chosen logging service
    try {
      // Example: Sentry.captureException(error);
      console.log('Would send to external logger:', error);
    } catch (logError) {
      console.error('Failed to send error to external logger:', logError);
    }
  }
  
  getErrors(filter?: {
    type?: StorageErrorType;
    severity?: ErrorSeverity;
    operation?: string;
    since?: Date;
  }): StorageError[] {
    let filteredErrors = this.errors;
    
    if (filter) {
      if (filter.type) {
        filteredErrors = filteredErrors.filter(e => e.type === filter.type);
      }
      if (filter.severity) {
        filteredErrors = filteredErrors.filter(e => e.severity === filter.severity);
      }
      if (filter.operation) {
        filteredErrors = filteredErrors.filter(e => e.operation === filter.operation);
      }
      if (filter.since) {
        filteredErrors = filteredErrors.filter(e => e.timestamp >= filter.since!);
      }
    }
    
    return filteredErrors;
  }
  
  getErrorStats() {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp >= lastHour);
    
    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<StorageErrorType, number>);
    
    const errorsBySeverity = recentErrors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorSeverity, number>);
    
    return {
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorsByType,
      errorsBySeverity,
      mostCommonError: Object.entries(errorsByType).sort(([,a], [,b]) => b - a)[0]?.[0],
    };
  }
  
  clear(): void {
    this.errors = [];
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

/**
 * User-friendly error notification utility
 */
export function showErrorNotification(error: StorageError): void {
  const variant = error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH 
    ? 'destructive' 
    : 'default';
  
  toast({
    title: 'Fehler',
    description: error.userMessage,
    variant,
    duration: error.severity === ErrorSeverity.LOW ? 3000 : 5000,
  });
  
  // Log the error
  errorLogger.log(error);
}

/**
 * Success notification utility
 */
export function showSuccessNotification(message: string, description?: string): void {
  toast({
    title: message,
    description,
    variant: 'default',
    duration: 3000,
  });
}

/**
 * Progress notification utility
 */
export function showProgressNotification(message: string): void {
  toast({
    title: message,
    description: 'Bitte warten...',
    variant: 'default',
    duration: 1000,
  });
}

/**
 * Error boundary hook for React components
 */
export function useErrorBoundary() {
  const handleError = (error: any, operation?: string) => {
    const storageError = mapError(error, operation);
    showErrorNotification(storageError);
    return storageError;
  };
  
  const handleAsyncError = async <T>(
    asyncOperation: () => Promise<T>,
    operation?: string
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, operation);
      return null;
    }
  };
  
  const handleAsyncErrorWithRetry = async <T>(
    asyncOperation: () => Promise<T>,
    operation?: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T | null> => {
    try {
      return await withRetry(asyncOperation, retryConfig, operation);
    } catch (error) {
      if (isStorageError(error)) {
        showErrorNotification(error);
      } else {
        handleError(error, operation);
      }
      return null;
    }
  };
  
  return {
    handleError,
    handleAsyncError,
    handleAsyncErrorWithRetry,
  };
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000, // 1 minute
    private monitoringPeriod = 300000 // 5 minutes
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
  
  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

// Global circuit breaker for storage operations
export const storageCircuitBreaker = new CircuitBreaker();

/**
 * Health check utility for storage service
 */
export async function checkStorageHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: StorageError;
}> {
  const startTime = Date.now();
  
  try {
    // Simple health check - try to list files in user's root directory
    const { createClient } = await import('@/utils/supabase/client');
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }
    
    // Try a simple storage operation
    await supabase.storage
      .from('documents')
      .list(`user_${user.id}`, { limit: 1 });
    
    const latency = Date.now() - startTime;
    
    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const storageError = mapError(error, 'health_check');
    
    return {
      healthy: false,
      latency,
      error: storageError,
    };
  }
}