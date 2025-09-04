/**
 * Comprehensive error handling and logging utilities for betriebskosten performance optimization
 * 
 * This module provides:
 * - Enhanced safeRpcCall utility with performance logging
 * - Structured error handling for database functions
 * - Performance monitoring for critical operations
 * - User-friendly error messages with proper feedback
 * 
 * @see .kiro/specs/betriebskosten-performance-optimization/tasks.md - Task 9
 */

import { logger } from '@/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Performance metrics for database function calls
 */
export interface PerformanceMetrics {
  functionName: string;
  executionTime: number;
  success: boolean;
  timestamp: Date;
  userId?: string;
  parameters?: Record<string, any>;
  errorMessage?: string;
}

/**
 * Enhanced result type for safe RPC calls with performance data
 */
export interface SafeRpcCallResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  performanceMetrics?: PerformanceMetrics;
}

/**
 * Error categories for better error handling and user feedback
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

/**
 * Structured error information
 */
export interface StructuredError {
  category: ErrorCategory;
  code?: string;
  message: string;
  userMessage: string;
  details?: Record<string, any>;
  retryable: boolean;
}

/**
 * Performance thresholds for different operations (in milliseconds)
 */
const PERFORMANCE_THRESHOLDS = {
  FAST: 1000,      // < 1s is fast
  ACCEPTABLE: 3000, // < 3s is acceptable
  SLOW: 5000,      // < 5s is slow
  TIMEOUT: 10000   // > 10s should timeout
};

/**
 * Maps Supabase error codes to structured errors
 */
function mapSupabaseError(error: any): StructuredError {
  const code = error.code || error.error_code || 'unknown';
  const message = error.message || 'Unknown database error';

  switch (code) {
    case 'PGRST116':
      return {
        category: ErrorCategory.DATABASE,
        code,
        message,
        userMessage: 'Die angeforderten Daten wurden nicht gefunden.',
        retryable: false
      };
    
    case 'PGRST301':
      return {
        category: ErrorCategory.PERMISSION,
        code,
        message,
        userMessage: 'Sie haben keine Berechtigung für diese Aktion.',
        retryable: false
      };
    
    case '23505':
      return {
        category: ErrorCategory.VALIDATION,
        code,
        message,
        userMessage: 'Ein Eintrag mit diesen Daten existiert bereits.',
        retryable: false
      };
    
    case '23503':
      return {
        category: ErrorCategory.VALIDATION,
        code,
        message,
        userMessage: 'Die referenzierten Daten sind nicht verfügbar.',
        retryable: false
      };
    
    case 'PGRST204':
      return {
        category: ErrorCategory.NETWORK,
        code,
        message,
        userMessage: 'Verbindungsfehler zur Datenbank. Bitte versuchen Sie es erneut.',
        retryable: true
      };
    
    default:
      return {
        category: ErrorCategory.DATABASE,
        code,
        message,
        userMessage: 'Ein Datenbankfehler ist aufgetreten. Bitte versuchen Sie es erneut.',
        retryable: true
      };
  }
}

/**
 * Enhanced safeRpcCall utility with comprehensive error handling and performance logging
 * 
 * @param supabase - Supabase client instance
 * @param functionName - Name of the database function to call
 * @param params - Parameters to pass to the database function
 * @param options - Additional options for error handling and logging
 * @returns Promise with success status, data, performance metrics, and structured error information
 */
export async function safeRpcCall<T>(
  supabase: any,
  functionName: string,
  params: Record<string, any>,
  options: {
    userId?: string;
    logPerformance?: boolean;
    timeoutMs?: number;
    retryCount?: number;
  } = {}
): Promise<SafeRpcCallResult<T>> {
  const startTime = Date.now();
  const timestamp = new Date();
  const { userId, logPerformance = true, timeoutMs = PERFORMANCE_THRESHOLDS.TIMEOUT, retryCount = 0 } = options;

  // Log the start of the operation
  logger.debug(`Starting RPC call: ${functionName}`, {
    functionName,
    userId,
    parameters: params,
    timestamp: timestamp.toISOString()
  });

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Database function ${functionName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Race between the RPC call and timeout
    const rpcPromise = supabase.rpc(functionName, params);
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

    const executionTime = Date.now() - startTime;

    // Create performance metrics
    const performanceMetrics: PerformanceMetrics = {
      functionName,
      executionTime,
      success: !error,
      timestamp,
      userId,
      parameters: logPerformance ? params : undefined,
      errorMessage: error?.message
    };

    // Log performance metrics
    if (logPerformance) {
      const performanceLevel = 
        executionTime < PERFORMANCE_THRESHOLDS.FAST ? 'fast' :
        executionTime < PERFORMANCE_THRESHOLDS.ACCEPTABLE ? 'acceptable' :
        executionTime < PERFORMANCE_THRESHOLDS.SLOW ? 'slow' : 'very_slow';

      logger.info(`RPC call completed: ${functionName}`, {
        functionName,
        executionTime,
        performanceLevel,
        success: !error,
        userId
      });

      // Warn about slow operations
      if (executionTime > PERFORMANCE_THRESHOLDS.ACCEPTABLE) {
        logger.warn(`Slow database operation detected: ${functionName}`, {
          functionName,
          executionTime,
          threshold: PERFORMANCE_THRESHOLDS.ACCEPTABLE,
          userId
        });
      }
    }

    if (error) {
      const structuredError = mapSupabaseError(error);
      
      logger.error(`RPC call failed: ${functionName}`, error, {
        functionName,
        userId,
        errorCategory: structuredError.category,
        errorCode: structuredError.code,
        executionTime,
        retryable: structuredError.retryable
      });

      return {
        success: false,
        message: structuredError.userMessage,
        performanceMetrics
      };
    }

    return {
      success: true,
      data,
      performanceMetrics
    };

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    const performanceMetrics: PerformanceMetrics = {
      functionName,
      executionTime,
      success: false,
      timestamp,
      userId,
      parameters: logPerformance ? params : undefined,
      errorMessage: error.message
    };

    // Handle timeout errors specifically
    if (error.message?.includes('timed out')) {
      logger.error(`RPC call timeout: ${functionName}`, error, {
        functionName,
        userId,
        executionTime,
        timeoutMs,
        errorCategory: ErrorCategory.TIMEOUT
      });

      return {
        success: false,
        message: 'Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut.',
        performanceMetrics
      };
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
      logger.error(`RPC call network error: ${functionName}`, error, {
        functionName,
        userId,
        executionTime,
        errorCategory: ErrorCategory.NETWORK
      });

      return {
        success: false,
        message: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        performanceMetrics
      };
    }

    // Generic error handling
    logger.error(`Unexpected error in RPC call: ${functionName}`, error, {
      functionName,
      userId,
      executionTime,
      errorCategory: ErrorCategory.UNKNOWN
    });

    return {
      success: false,
      message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      performanceMetrics
    };
  }
}

/**
 * Retry wrapper for database operations with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<SafeRpcCallResult<T>>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryCondition?: (error: SafeRpcCallResult<T>) => boolean;
  } = {}
): Promise<SafeRpcCallResult<T>> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    retryCondition = (result) => !result.success && result.performanceMetrics?.errorMessage?.includes('network')
  } = options;

  let lastResult: SafeRpcCallResult<T>;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await operation();
    
    if (lastResult.success || !retryCondition(lastResult)) {
      return lastResult;
    }
    
    if (attempt < maxRetries) {
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      logger.info(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return lastResult!;
}

/**
 * Performance monitoring utility for tracking database function performance over time
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 1000; // Keep last 1000 metrics in memory

  static addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
  }

  static getMetrics(functionName?: string, since?: Date): PerformanceMetrics[] {
    let filtered = this.metrics;
    
    if (functionName) {
      filtered = filtered.filter(m => m.functionName === functionName);
    }
    
    if (since) {
      filtered = filtered.filter(m => m.timestamp >= since);
    }
    
    return filtered;
  }

  static getAverageExecutionTime(functionName: string, since?: Date): number {
    const metrics = this.getMetrics(functionName, since);
    if (metrics.length === 0) return 0;
    
    const total = metrics.reduce((sum, m) => sum + m.executionTime, 0);
    return total / metrics.length;
  }

  static getSuccessRate(functionName: string, since?: Date): number {
    const metrics = this.getMetrics(functionName, since);
    if (metrics.length === 0) return 0;
    
    const successful = metrics.filter(m => m.success).length;
    return successful / metrics.length;
  }

  static getSlowOperations(thresholdMs: number = PERFORMANCE_THRESHOLDS.SLOW): PerformanceMetrics[] {
    return this.metrics.filter(m => m.executionTime > thresholdMs);
  }
}

/**
 * User-friendly error message generator
 */
export function generateUserFriendlyErrorMessage(
  error: any,
  operation: string,
  context?: Record<string, any>
): string {
  const structuredError = mapSupabaseError(error);
  
  const baseMessage = structuredError.userMessage;
  const operationInfo = operation ? ` (${operation})` : '';
  
  return `${baseMessage}${operationInfo}`;
}

/**
 * Error recovery suggestions based on error type
 */
export function getErrorRecoveryActions(error: StructuredError): string[] {
  const actions: string[] = [];
  
  switch (error.category) {
    case ErrorCategory.NETWORK:
      actions.push('Überprüfen Sie Ihre Internetverbindung');
      actions.push('Versuchen Sie es in wenigen Sekunden erneut');
      break;
      
    case ErrorCategory.TIMEOUT:
      actions.push('Die Anfrage dauerte zu lange');
      actions.push('Versuchen Sie es mit weniger Daten erneut');
      actions.push('Kontaktieren Sie den Support, falls das Problem weiterhin besteht');
      break;
      
    case ErrorCategory.VALIDATION:
      actions.push('Überprüfen Sie Ihre Eingaben');
      actions.push('Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind');
      break;
      
    case ErrorCategory.PERMISSION:
      actions.push('Sie haben keine Berechtigung für diese Aktion');
      actions.push('Kontaktieren Sie Ihren Administrator');
      break;
      
    case ErrorCategory.AUTHENTICATION:
      actions.push('Bitte melden Sie sich erneut an');
      actions.push('Überprüfen Sie Ihre Anmeldedaten');
      break;
      
    default:
      if (error.retryable) {
        actions.push('Versuchen Sie es erneut');
        actions.push('Kontaktieren Sie den Support, falls das Problem weiterhin besteht');
      } else {
        actions.push('Kontaktieren Sie den Support für weitere Hilfe');
      }
  }
  
  return actions;
}