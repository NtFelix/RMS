/**
 * Template System Error Handler
 * Provides comprehensive error handling for template operations
 */

import { logger } from '@/utils/logger';
import type { TemplateError } from '@/types/template-system';

/**
 * Template-specific error types
 */
export enum TemplateErrorType {
  VALIDATION_ERROR = 'validation_error',
  PROCESSING_ERROR = 'processing_error',
  CONTEXT_ERROR = 'context_error',
  DATABASE_ERROR = 'database_error',
  SECURITY_ERROR = 'security_error',
  PLACEHOLDER_ERROR = 'placeholder_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PERMISSION_ERROR = 'permission_error',
  NOT_FOUND_ERROR = 'not_found_error'
}

/**
 * Enhanced template error with recovery suggestions
 */
export interface EnhancedTemplateError extends TemplateError {
  errorId: string;
  timestamp: Date;
  userId?: string;
  templateId?: string;
  recoveryActions: string[];
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Error context for better debugging
 */
export interface ErrorContext {
  operation: string;
  templateId?: string;
  userId?: string;
  userAgent?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

/**
 * Template error handler class
 */
export class TemplateErrorHandler {
  private static errorCount = new Map<string, number>();
  private static readonly MAX_ERROR_RATE = 10; // Max errors per minute per user
  private static readonly ERROR_RATE_WINDOW = 60000; // 1 minute
  
  /**
   * Handle and process template errors
   */
  static handleError(
    error: any,
    context: ErrorContext,
    options: {
      showToUser?: boolean;
      logError?: boolean;
      includeStackTrace?: boolean;
    } = {}
  ): EnhancedTemplateError {
    const {
      showToUser = true,
      logError = true,
      includeStackTrace = false
    } = options;
    
    const errorId = this.generateErrorId();
    const enhancedError = this.enhanceError(error, context, errorId);
    
    // Log error if requested
    if (logError) {
      this.logError(enhancedError, context, includeStackTrace);
    }
    
    // Track error rate
    this.trackErrorRate(context.userId || 'anonymous');
    
    return enhancedError;
  }
  
  /**
   * Enhance basic error with additional information
   */
  private static enhanceError(
    error: any,
    context: ErrorContext,
    errorId: string
  ): EnhancedTemplateError {
    const errorType = this.determineErrorType(error);
    const userMessage = this.generateUserMessage(error, errorType, context);
    const recoveryActions = this.getRecoveryActions(errorType, error);
    const severity = this.determineSeverity(errorType, error);
    
    return {
      type: this.mapErrorTypeToTemplateErrorType(errorType),
      message: userMessage,
      field: this.extractFieldFromError(error),
      placeholder: this.extractPlaceholderFromError(error),
      errorId,
      timestamp: new Date(),
      userId: context.userId,
      templateId: context.templateId,
      recoveryActions,
      retryable: this.isRetryable(errorType),
      severity
    };
  }
  
  /**
   * Determine the type of error
   */
  private static determineErrorType(error: any): TemplateErrorType {
    const message = error.message || '';
    const name = error.name || '';
    const code = error.code || '';
    
    if (name === 'ValidationError' || code === 'VALIDATION_FAILED') {
      return TemplateErrorType.VALIDATION_ERROR;
    }
    
    if (name === 'SecurityError' || message.toLowerCase().includes('security')) {
      return TemplateErrorType.SECURITY_ERROR;
    }
    
    if (code === 'PGRST116' || message.toLowerCase().includes('not found')) {
      return TemplateErrorType.NOT_FOUND_ERROR;
    }
    
    if (code === 'PGRST301' || message.toLowerCase().includes('permission')) {
      return TemplateErrorType.PERMISSION_ERROR;
    }
    
    if (name === 'NetworkError' || message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
      return TemplateErrorType.NETWORK_ERROR;
    }
    
    if (message.toLowerCase().includes('timeout') || message.toLowerCase().includes('timed out')) {
      return TemplateErrorType.TIMEOUT_ERROR;
    }
    
    if (message.toLowerCase().includes('placeholder')) {
      return TemplateErrorType.PLACEHOLDER_ERROR;
    }
    
    if (message.toLowerCase().includes('context')) {
      return TemplateErrorType.CONTEXT_ERROR;
    }
    
    if (message.toLowerCase().includes('database') || code.startsWith('PG')) {
      return TemplateErrorType.DATABASE_ERROR;
    }
    
    return TemplateErrorType.PROCESSING_ERROR;
  }
  
  /**
   * Generate user-friendly error message
   */
  private static generateUserMessage(
    error: any,
    errorType: TemplateErrorType,
    context: ErrorContext
  ): string {
    const operation = context.operation;
    
    switch (errorType) {
      case TemplateErrorType.VALIDATION_ERROR:
        return `Validierungsfehler beim ${operation}: ${this.extractValidationMessage(error)}`;
        
      case TemplateErrorType.SECURITY_ERROR:
        return `Sicherheitsfehler: Das Template enthält nicht erlaubte Inhalte.`;
        
      case TemplateErrorType.NOT_FOUND_ERROR:
        return `Das angeforderte Template wurde nicht gefunden.`;
        
      case TemplateErrorType.PERMISSION_ERROR:
        return `Sie haben keine Berechtigung für diese Aktion.`;
        
      case TemplateErrorType.NETWORK_ERROR:
        return `Netzwerkfehler beim ${operation}. Bitte überprüfen Sie Ihre Internetverbindung.`;
        
      case TemplateErrorType.TIMEOUT_ERROR:
        return `Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut.`;
        
      case TemplateErrorType.PLACEHOLDER_ERROR:
        return `Fehler bei der Verarbeitung von Platzhaltern: ${error.message}`;
        
      case TemplateErrorType.CONTEXT_ERROR:
        return `Fehler bei der Kontext-Verarbeitung: ${error.message}`;
        
      case TemplateErrorType.DATABASE_ERROR:
        return `Datenbankfehler beim ${operation}. Bitte versuchen Sie es später erneut.`;
        
      default:
        return `Ein unerwarteter Fehler ist beim ${operation} aufgetreten.`;
    }
  }
  
  /**
   * Get recovery actions for error type
   */
  private static getRecoveryActions(errorType: TemplateErrorType, error: any): string[] {
    const actions: string[] = [];
    
    switch (errorType) {
      case TemplateErrorType.VALIDATION_ERROR:
        actions.push('Überprüfen Sie Ihre Eingaben');
        actions.push('Stellen Sie sicher, dass alle Pflichtfelder ausgefüllt sind');
        actions.push('Verwenden Sie nur erlaubte Zeichen im Template-Namen');
        break;
        
      case TemplateErrorType.SECURITY_ERROR:
        actions.push('Entfernen Sie HTML-Script-Tags aus dem Template');
        actions.push('Verwenden Sie nur sichere Platzhalter');
        actions.push('Kontaktieren Sie den Support für weitere Hilfe');
        break;
        
      case TemplateErrorType.NETWORK_ERROR:
        actions.push('Überprüfen Sie Ihre Internetverbindung');
        actions.push('Versuchen Sie es in wenigen Sekunden erneut');
        actions.push('Laden Sie die Seite neu, falls das Problem weiterhin besteht');
        break;
        
      case TemplateErrorType.TIMEOUT_ERROR:
        actions.push('Versuchen Sie es mit einem kürzeren Template erneut');
        actions.push('Reduzieren Sie die Anzahl der Platzhalter');
        actions.push('Kontaktieren Sie den Support bei wiederholten Problemen');
        break;
        
      case TemplateErrorType.PLACEHOLDER_ERROR:
        actions.push('Überprüfen Sie die Platzhalter-Syntax (@platzhalter.name)');
        actions.push('Verwenden Sie nur unterstützte Platzhalter');
        actions.push('Nutzen Sie die Autocomplete-Funktion für korrekte Platzhalter');
        break;
        
      case TemplateErrorType.CONTEXT_ERROR:
        actions.push('Wählen Sie alle erforderlichen Kontexte aus');
        actions.push('Stellen Sie sicher, dass die ausgewählten Entitäten existieren');
        actions.push('Überprüfen Sie die Template-Anforderungen');
        break;
        
      case TemplateErrorType.PERMISSION_ERROR:
        actions.push('Melden Sie sich erneut an');
        actions.push('Kontaktieren Sie Ihren Administrator');
        break;
        
      case TemplateErrorType.NOT_FOUND_ERROR:
        actions.push('Überprüfen Sie, ob das Template noch existiert');
        actions.push('Aktualisieren Sie die Template-Liste');
        actions.push('Erstellen Sie ein neues Template, falls nötig');
        break;
        
      default:
        actions.push('Versuchen Sie es erneut');
        actions.push('Laden Sie die Seite neu');
        actions.push('Kontaktieren Sie den Support, falls das Problem weiterhin besteht');
    }
    
    return actions;
  }
  
  /**
   * Determine error severity
   */
  private static determineSeverity(
    errorType: TemplateErrorType,
    error: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorType) {
      case TemplateErrorType.SECURITY_ERROR:
        return 'critical';
        
      case TemplateErrorType.DATABASE_ERROR:
      case TemplateErrorType.PERMISSION_ERROR:
        return 'high';
        
      case TemplateErrorType.VALIDATION_ERROR:
      case TemplateErrorType.CONTEXT_ERROR:
      case TemplateErrorType.PLACEHOLDER_ERROR:
        return 'medium';
        
      default:
        return 'low';
    }
  }
  
  /**
   * Check if error is retryable
   */
  private static isRetryable(errorType: TemplateErrorType): boolean {
    const retryableErrors = [
      TemplateErrorType.NETWORK_ERROR,
      TemplateErrorType.TIMEOUT_ERROR,
      TemplateErrorType.DATABASE_ERROR,
      TemplateErrorType.PROCESSING_ERROR
    ];
    
    return retryableErrors.includes(errorType);
  }
  
  /**
   * Map error type to template error type
   */
  private static mapErrorTypeToTemplateErrorType(errorType: TemplateErrorType): 'validation' | 'processing' | 'context' | 'database' {
    switch (errorType) {
      case TemplateErrorType.VALIDATION_ERROR:
      case TemplateErrorType.SECURITY_ERROR:
        return 'validation';
        
      case TemplateErrorType.CONTEXT_ERROR:
        return 'context';
        
      case TemplateErrorType.DATABASE_ERROR:
      case TemplateErrorType.NOT_FOUND_ERROR:
      case TemplateErrorType.PERMISSION_ERROR:
        return 'database';
        
      default:
        return 'processing';
    }
  }
  
  /**
   * Extract field name from validation error
   */
  private static extractFieldFromError(error: any): string | undefined {
    if (error.path && Array.isArray(error.path)) {
      return error.path.join('.');
    }
    
    if (error.field) {
      return error.field;
    }
    
    return undefined;
  }
  
  /**
   * Extract placeholder from error message
   */
  private static extractPlaceholderFromError(error: any): string | undefined {
    if (error.placeholder) {
      return error.placeholder;
    }
    
    // Try to extract placeholder from message
    const placeholderMatch = error.message?.match(/@[a-zA-Z][a-zA-Z0-9._]*/);
    return placeholderMatch?.[0];
  }
  
  /**
   * Extract validation message from error
   */
  private static extractValidationMessage(error: any): string {
    if (error.message) {
      return error.message;
    }
    
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map((e: any) => e.message).join(', ');
    }
    
    return 'Unbekannter Validierungsfehler';
  }
  
  /**
   * Log error with appropriate level
   */
  private static logError(
    error: EnhancedTemplateError,
    context: ErrorContext,
    includeStackTrace: boolean
  ): void {
    const logData = {
      errorId: error.errorId,
      errorType: error.type,
      operation: context.operation,
      templateId: context.templateId,
      userId: context.userId,
      severity: error.severity,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString(),
      additionalData: context.additionalData
    };
    
    switch (error.severity) {
      case 'critical':
        logger.error(`Critical template error: ${error.message}`, logData);
        break;
        
      case 'high':
        logger.error(`High severity template error: ${error.message}`, logData);
        break;
        
      case 'medium':
        logger.warn(`Template error: ${error.message}`, logData);
        break;
        
      default:
        logger.info(`Template error: ${error.message}`, logData);
    }
    
    if (includeStackTrace && error.type === 'processing') {
      logger.debug('Error stack trace', { errorId: error.errorId });
    }
  }
  
  /**
   * Track error rate for abuse prevention
   */
  private static trackErrorRate(userId: string): void {
    const now = Date.now();
    const key = `${userId}_${Math.floor(now / this.ERROR_RATE_WINDOW)}`;
    
    const currentCount = this.errorCount.get(key) || 0;
    this.errorCount.set(key, currentCount + 1);
    
    // Clean up old entries
    for (const [k, _] of this.errorCount.entries()) {
      const keyTime = parseInt(k.split('_')[1]) * this.ERROR_RATE_WINDOW;
      if (now - keyTime > this.ERROR_RATE_WINDOW * 2) {
        this.errorCount.delete(k);
      }
    }
    
    // Log if error rate is too high
    if (currentCount > this.MAX_ERROR_RATE) {
      logger.warn(`High error rate detected for user ${userId}`, {
        userId,
        errorCount: currentCount,
        timeWindow: this.ERROR_RATE_WINDOW
      });
    }
  }
  
  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `tpl_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Check if user has exceeded error rate limit
   */
  static isErrorRateLimitExceeded(userId: string): boolean {
    const now = Date.now();
    const key = `${userId}_${Math.floor(now / this.ERROR_RATE_WINDOW)}`;
    const currentCount = this.errorCount.get(key) || 0;
    
    return currentCount > this.MAX_ERROR_RATE;
  }
  
  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByUser: Record<string, number>;
  } {
    const stats = {
      totalErrors: 0,
      errorsByType: {} as Record<string, number>,
      errorsByUser: {} as Record<string, number>
    };
    
    // This would typically be implemented with a proper metrics store
    // For now, return empty stats
    return stats;
  }
}

/**
 * Template operation wrapper with error handling
 */
export async function withTemplateErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options?: {
    retryCount?: number;
    retryDelay?: number;
    showToUser?: boolean;
  }
): Promise<{ success: boolean; data?: T; error?: EnhancedTemplateError }> {
  const { retryCount = 0, retryDelay = 1000, showToUser = true } = options || {};
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const data = await operation();
      return { success: true, data };
      
    } catch (error) {
      lastError = error;
      
      const enhancedError = TemplateErrorHandler.handleError(error, context, {
        showToUser: showToUser && attempt === retryCount, // Only show to user on final attempt
        logError: true,
        includeStackTrace: attempt === retryCount
      });
      
      // Don't retry if error is not retryable or if it's the last attempt
      if (!enhancedError.retryable || attempt === retryCount) {
        return { success: false, error: enhancedError };
      }
      
      // Wait before retry
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  // This should never be reached, but just in case
  const finalError = TemplateErrorHandler.handleError(lastError, context);
  return { success: false, error: finalError };
}

// Export error handler instance
export const templateErrorHandler = TemplateErrorHandler;