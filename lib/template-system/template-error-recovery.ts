/**
 * Template Error Recovery System
 * Provides graceful error recovery and user feedback mechanisms
 */

import { toast } from 'sonner';
import type { EnhancedTemplateError } from './template-error-handler';
import type { TemplateValidationResult } from '@/types/template-system';

/**
 * Recovery strategy interface
 */
export interface RecoveryStrategy {
  canRecover: (error: EnhancedTemplateError) => boolean;
  recover: (error: EnhancedTemplateError, context?: any) => Promise<boolean>;
  getRecoveryMessage: () => string;
}

/**
 * Auto-correction strategy for common template errors
 */
export class AutoCorrectionStrategy implements RecoveryStrategy {
  canRecover(error: EnhancedTemplateError): boolean {
    return error.type === 'validation' && 
           error.placeholder !== undefined &&
           error.message.includes('Unbekannter Platzhalter');
  }
  
  async recover(error: EnhancedTemplateError, context?: { 
    content: string; 
    onContentChange: (content: string) => void;
    suggestions: string[];
  }): Promise<boolean> {
    if (!context || !error.placeholder) return false;
    
    // Try to auto-correct common typos
    const corrections = this.getCommonCorrections();
    const correction = corrections[error.placeholder];
    
    if (correction && context.suggestions.includes(correction)) {
      const correctedContent = context.content.replace(
        new RegExp(this.escapeRegExp(error.placeholder), 'g'),
        correction
      );
      
      context.onContentChange(correctedContent);
      
      toast.success(`Platzhalter automatisch korrigiert: ${error.placeholder} → ${correction}`);
      return true;
    }
    
    return false;
  }
  
  getRecoveryMessage(): string {
    return 'Platzhalter wurde automatisch korrigiert';
  }
  
  private getCommonCorrections(): Record<string, string> {
    return {
      '@mieter.namen': '@mieter.name',
      '@mieter.mail': '@mieter.email',
      '@mieter.telefon': '@mieter.telefonnummer',
      '@wohnung.addresse': '@wohnung.adresse',
      '@wohnung.size': '@wohnung.groesse',
      '@haus.addresse': '@haus.adresse',
      '@datum.heute': '@datum',
      '@vermieter.namen': '@vermieter.name'
    };
  }
  
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

/**
 * Context suggestion strategy
 */
export class ContextSuggestionStrategy implements RecoveryStrategy {
  canRecover(error: EnhancedTemplateError): boolean {
    return error.type === 'context' && 
           error.message.includes('Fehlende erforderliche Kontexte');
  }
  
  async recover(error: EnhancedTemplateError, context?: {
    onContextSuggestion: (contexts: string[]) => void;
  }): Promise<boolean> {
    if (!context) return false;
    
    // Extract missing contexts from error message
    const missingContexts = this.extractMissingContexts(error.message);
    
    if (missingContexts.length > 0) {
      context.onContextSuggestion(missingContexts);
      
      toast.info(`Bitte wählen Sie folgende Kontexte aus: ${missingContexts.join(', ')}`);
      return true;
    }
    
    return false;
  }
  
  getRecoveryMessage(): string {
    return 'Fehlende Kontexte wurden vorgeschlagen';
  }
  
  private extractMissingContexts(message: string): string[] {
    const match = message.match(/Fehlende erforderliche Kontexte: (.+)/);
    if (match) {
      return match[1].split(', ').map(ctx => ctx.trim());
    }
    return [];
  }
}

/**
 * Retry strategy for transient errors
 */
export class RetryStrategy implements RecoveryStrategy {
  private retryCount = 0;
  private readonly maxRetries = 3;
  
  canRecover(error: EnhancedTemplateError): boolean {
    return error.retryable && this.retryCount < this.maxRetries;
  }
  
  async recover(error: EnhancedTemplateError, context?: {
    retryOperation: () => Promise<any>;
  }): Promise<boolean> {
    if (!context || this.retryCount >= this.maxRetries) return false;
    
    this.retryCount++;
    
    try {
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      await context.retryOperation();
      
      toast.success(`Operation erfolgreich nach ${this.retryCount} Versuchen`);
      this.retryCount = 0; // Reset on success
      return true;
      
    } catch (retryError) {
      if (this.retryCount >= this.maxRetries) {
        toast.error(`Operation fehlgeschlagen nach ${this.maxRetries} Versuchen`);
        this.retryCount = 0; // Reset after max retries
      }
      return false;
    }
  }
  
  getRecoveryMessage(): string {
    return `Wiederholung ${this.retryCount}/${this.maxRetries}`;
  }
}

/**
 * Fallback content strategy
 */
export class FallbackContentStrategy implements RecoveryStrategy {
  canRecover(error: EnhancedTemplateError): boolean {
    return error.type === 'processing' && 
           error.message.includes('Platzhalter');
  }
  
  async recover(error: EnhancedTemplateError, context?: {
    content: string;
    onContentChange: (content: string) => void;
  }): Promise<boolean> {
    if (!context) return false;
    
    // Replace problematic placeholders with fallback text
    let fallbackContent = context.content;
    const placeholderRegex = /@[a-zA-Z][a-zA-Z0-9._]*\b/g;
    
    fallbackContent = fallbackContent.replace(placeholderRegex, (match) => {
      return `[${this.getPlaceholderLabel(match)}]`;
    });
    
    context.onContentChange(fallbackContent);
    
    toast.info('Platzhalter wurden durch Fallback-Text ersetzt');
    return true;
  }
  
  getRecoveryMessage(): string {
    return 'Fallback-Inhalt wurde verwendet';
  }
  
  private getPlaceholderLabel(placeholder: string): string {
    const labels: Record<string, string> = {
      '@mieter.name': 'Mieter Name',
      '@mieter.email': 'Mieter E-Mail',
      '@wohnung.adresse': 'Wohnung Adresse',
      '@haus.name': 'Haus Name',
      '@datum': 'Datum',
      '@vermieter.name': 'Vermieter Name'
    };
    
    return labels[placeholder] || placeholder.replace('@', '').replace('.', ' ');
  }
}

/**
 * Template error recovery manager
 */
export class TemplateErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [
    new AutoCorrectionStrategy(),
    new ContextSuggestionStrategy(),
    new RetryStrategy(),
    new FallbackContentStrategy()
  ];
  
  /**
   * Attempt to recover from an error
   */
  async attemptRecovery(
    error: EnhancedTemplateError,
    context?: any
  ): Promise<{ recovered: boolean; strategy?: string; message?: string }> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error, context);
          
          if (recovered) {
            return {
              recovered: true,
              strategy: strategy.constructor.name,
              message: strategy.getRecoveryMessage()
            };
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy ${strategy.constructor.name} failed:`, recoveryError);
        }
      }
    }
    
    return { recovered: false };
  }
  
  /**
   * Get recovery suggestions for an error
   */
  getRecoverySuggestions(error: EnhancedTemplateError): string[] {
    const suggestions: string[] = [];
    
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        suggestions.push(strategy.getRecoveryMessage());
      }
    }
    
    // Add general recovery actions from the error
    suggestions.push(...error.recoveryActions);
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
  
  /**
   * Add custom recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.unshift(strategy); // Add to beginning for priority
  }
}

/**
 * User feedback manager for template errors
 */
export class TemplateErrorFeedbackManager {
  /**
   * Show error feedback to user
   */
  static showErrorFeedback(
    error: EnhancedTemplateError,
    options: {
      showRecoveryActions?: boolean;
      allowRetry?: boolean;
      onRetry?: () => void;
      onDismiss?: () => void;
    } = {}
  ): void {
    const {
      showRecoveryActions = true,
      allowRetry = false,
      onRetry,
      onDismiss
    } = options;
    
    // Determine toast type based on severity
    const toastType = this.getToastType(error.severity);
    
    // Create toast message
    let message = error.message;
    
    if (showRecoveryActions && error.recoveryActions.length > 0) {
      message += '\n\nLösungsvorschläge:\n' + 
                 error.recoveryActions.slice(0, 3).map(action => `• ${action}`).join('\n');
    }
    
    // Show toast with appropriate styling
    const toastOptions: any = {
      description: message,
      duration: this.getToastDuration(error.severity),
      action: allowRetry && onRetry ? {
        label: 'Erneut versuchen',
        onClick: onRetry
      } : undefined,
      onDismiss
    };
    
    switch (toastType) {
      case 'error':
        toast.error('Template-Fehler', toastOptions);
        break;
      case 'warning':
        toast.warning('Template-Warnung', toastOptions);
        break;
      default:
        toast.info('Template-Information', toastOptions);
    }
  }
  
  /**
   * Show validation feedback
   */
  static showValidationFeedback(
    result: TemplateValidationResult,
    options: {
      showWarnings?: boolean;
      onFix?: (error: string) => void;
    } = {}
  ): void {
    const { showWarnings = true, onFix } = options;
    
    // Show errors
    if (result.errors.length > 0) {
      const errorMessage = result.errors.length === 1 
        ? result.errors[0]
        : `${result.errors.length} Validierungsfehler gefunden:\n${result.errors.slice(0, 3).map(e => `• ${e}`).join('\n')}`;
      
      toast.error('Validierungsfehler', {
        description: errorMessage,
        duration: 6000,
        action: onFix ? {
          label: 'Beheben',
          onClick: () => onFix(result.errors[0])
        } : undefined
      });
    }
    
    // Show warnings
    if (showWarnings && result.warnings.length > 0) {
      const warningMessage = result.warnings.length === 1
        ? result.warnings[0]
        : `${result.warnings.length} Warnungen:\n${result.warnings.slice(0, 2).map(w => `• ${w}`).join('\n')}`;
      
      toast.warning('Template-Warnungen', {
        description: warningMessage,
        duration: 4000
      });
    }
    
    // Show success if no errors
    if (result.isValid && result.errors.length === 0) {
      toast.success('Template-Validierung erfolgreich', {
        description: `Template ist gültig${result.placeholders.length > 0 ? ` mit ${result.placeholders.length} Platzhaltern` : ''}`,
        duration: 2000
      });
    }
  }
  
  /**
   * Show recovery success feedback
   */
  static showRecoverySuccess(strategy: string, message: string): void {
    toast.success('Automatische Wiederherstellung', {
      description: `${message} (${strategy})`,
      duration: 3000
    });
  }
  
  /**
   * Get toast type based on error severity
   */
  private static getToastType(severity: string): 'error' | 'warning' | 'info' {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  }
  
  /**
   * Get toast duration based on error severity
   */
  private static getToastDuration(severity: string): number {
    switch (severity) {
      case 'critical':
        return 10000; // 10 seconds
      case 'high':
        return 8000;  // 8 seconds
      case 'medium':
        return 6000;  // 6 seconds
      default:
        return 4000;  // 4 seconds
    }
  }
}

// Export singleton instances
export const templateErrorRecoveryManager = new TemplateErrorRecoveryManager();
export const templateErrorFeedback = TemplateErrorFeedbackManager;