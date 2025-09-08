/**
 * Template Error Recovery Tests
 * Tests for template error recovery and user feedback systems
 */

import {
  AutoCorrectionStrategy,
  ContextSuggestionStrategy,
  RetryStrategy,
  FallbackContentStrategy,
  TemplateErrorRecoveryManager,
  TemplateErrorFeedbackManager,
  templateErrorRecoveryManager
} from '@/lib/template-system/template-error-recovery';
import type { EnhancedTemplateError } from '@/lib/template-system/template-error-handler';
import type { TemplateValidationResult } from '@/types/template-system';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  }
}));

import { toast } from 'sonner';

describe('Template Error Recovery System', () => {
  const mockError: EnhancedTemplateError = {
    type: 'validation',
    message: 'Test error',
    errorId: 'test-error-id',
    timestamp: new Date(),
    recoveryActions: ['Action 1', 'Action 2'],
    retryable: false,
    severity: 'medium'
  };

  describe('AutoCorrectionStrategy', () => {
    let strategy: AutoCorrectionStrategy;

    beforeEach(() => {
      strategy = new AutoCorrectionStrategy();
    });

    it('should identify correctable placeholder errors', () => {
      const placeholderError: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Unbekannter Platzhalter: @mieter.namen',
        placeholder: '@mieter.namen'
      };

      expect(strategy.canRecover(placeholderError)).toBe(true);
    });

    it('should not identify non-placeholder errors as correctable', () => {
      const nonPlaceholderError: EnhancedTemplateError = {
        ...mockError,
        type: 'database',
        message: 'Database connection failed'
      };

      expect(strategy.canRecover(nonPlaceholderError)).toBe(false);
    });

    it('should auto-correct common typos', async () => {
      const placeholderError: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Unbekannter Platzhalter: @mieter.namen',
        placeholder: '@mieter.namen'
      };

      const mockContext = {
        content: 'Hello @mieter.namen, welcome!',
        onContentChange: jest.fn(),
        suggestions: ['@mieter.name']
      };

      const result = await strategy.recover(placeholderError, mockContext);

      expect(result).toBe(true);
      expect(mockContext.onContentChange).toHaveBeenCalledWith('Hello @mieter.name, welcome!');
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('automatisch korrigiert')
      );
    });

    it('should not correct if no valid suggestion exists', async () => {
      const placeholderError: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Unbekannter Platzhalter: @invalid.placeholder',
        placeholder: '@invalid.placeholder'
      };

      const mockContext = {
        content: 'Hello @invalid.placeholder',
        onContentChange: jest.fn(),
        suggestions: []
      };

      const result = await strategy.recover(placeholderError, mockContext);

      expect(result).toBe(false);
      expect(mockContext.onContentChange).not.toHaveBeenCalled();
    });
  });

  describe('ContextSuggestionStrategy', () => {
    let strategy: ContextSuggestionStrategy;

    beforeEach(() => {
      strategy = new ContextSuggestionStrategy();
    });

    it('should identify context errors', () => {
      const contextError: EnhancedTemplateError = {
        ...mockError,
        type: 'context',
        message: 'Fehlende erforderliche Kontexte: mieter, wohnung'
      };

      expect(strategy.canRecover(contextError)).toBe(true);
    });

    it('should not identify non-context errors', () => {
      const nonContextError: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Invalid template name'
      };

      expect(strategy.canRecover(nonContextError)).toBe(false);
    });

    it('should suggest missing contexts', async () => {
      const contextError: EnhancedTemplateError = {
        ...mockError,
        type: 'context',
        message: 'Fehlende erforderliche Kontexte: mieter, wohnung'
      };

      const mockContext = {
        onContextSuggestion: jest.fn()
      };

      const result = await strategy.recover(contextError, mockContext);

      expect(result).toBe(true);
      expect(mockContext.onContextSuggestion).toHaveBeenCalledWith(['mieter', 'wohnung']);
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Bitte wählen Sie folgende Kontexte aus')
      );
    });
  });

  describe('RetryStrategy', () => {
    let strategy: RetryStrategy;

    beforeEach(() => {
      strategy = new RetryStrategy();
      // Reset retry count
      (strategy as any).retryCount = 0;
    });

    it('should identify retryable errors', () => {
      const retryableError: EnhancedTemplateError = {
        ...mockError,
        retryable: true
      };

      expect(strategy.canRecover(retryableError)).toBe(true);
    });

    it('should not identify non-retryable errors', () => {
      const nonRetryableError: EnhancedTemplateError = {
        ...mockError,
        retryable: false
      };

      expect(strategy.canRecover(nonRetryableError)).toBe(false);
    });

    it('should retry operations successfully', async () => {
      const retryableError: EnhancedTemplateError = {
        ...mockError,
        retryable: true
      };

      const mockContext = {
        retryOperation: jest.fn().mockResolvedValue('success')
      };

      const result = await strategy.recover(retryableError, mockContext);

      expect(result).toBe(true);
      expect(mockContext.retryOperation).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('erfolgreich nach')
      );
    });

    it('should handle retry failures', async () => {
      const retryableError: EnhancedTemplateError = {
        ...mockError,
        retryable: true
      };

      const mockContext = {
        retryOperation: jest.fn().mockRejectedValue(new Error('Still failing'))
      };

      // Exhaust all retries
      for (let i = 0; i < 3; i++) {
        await strategy.recover(retryableError, mockContext);
      }

      const result = await strategy.recover(retryableError, mockContext);

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('fehlgeschlagen nach')
      );
    });
  });

  describe('FallbackContentStrategy', () => {
    let strategy: FallbackContentStrategy;

    beforeEach(() => {
      strategy = new FallbackContentStrategy();
    });

    it('should identify processing errors with placeholders', () => {
      const processingError: EnhancedTemplateError = {
        ...mockError,
        type: 'processing',
        message: 'Error processing Platzhalter @mieter.name'
      };

      expect(strategy.canRecover(processingError)).toBe(true);
    });

    it('should replace placeholders with fallback text', async () => {
      const processingError: EnhancedTemplateError = {
        ...mockError,
        type: 'processing',
        message: 'Error processing placeholders'
      };

      const mockContext = {
        content: 'Hello @mieter.name, your rent is @wohnung.miete',
        onContentChange: jest.fn()
      };

      const result = await strategy.recover(processingError, mockContext);

      expect(result).toBe(true);
      expect(mockContext.onContentChange).toHaveBeenCalledWith(
        'Hello [Mieter Name], your rent is [wohnung miete]'
      );
      expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining('Fallback-Text ersetzt')
      );
    });
  });

  describe('TemplateErrorRecoveryManager', () => {
    let manager: TemplateErrorRecoveryManager;

    beforeEach(() => {
      manager = new TemplateErrorRecoveryManager();
    });

    it('should attempt recovery with appropriate strategy', async () => {
      const placeholderError: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Unbekannter Platzhalter: @mieter.namen',
        placeholder: '@mieter.namen'
      };

      const mockContext = {
        content: 'Hello @mieter.namen',
        onContentChange: jest.fn(),
        suggestions: ['@mieter.name']
      };

      const result = await manager.attemptRecovery(placeholderError, mockContext);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('AutoCorrectionStrategy');
      expect(result.message).toContain('automatisch korrigiert');
    });

    it('should return false if no strategy can recover', async () => {
      const unrecoverableError: EnhancedTemplateError = {
        ...mockError,
        type: 'database',
        message: 'Critical database failure',
        retryable: false
      };

      const result = await manager.attemptRecovery(unrecoverableError);

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBeUndefined();
    });

    it('should get recovery suggestions', () => {
      const error: EnhancedTemplateError = {
        ...mockError,
        type: 'validation',
        message: 'Validation error',
        recoveryActions: ['Check inputs', 'Try again']
      };

      const suggestions = manager.getRecoverySuggestions(error);

      expect(suggestions).toContain('Check inputs');
      expect(suggestions).toContain('Try again');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should allow adding custom strategies', () => {
      const customStrategy = {
        canRecover: jest.fn().mockReturnValue(true),
        recover: jest.fn().mockResolvedValue(true),
        getRecoveryMessage: jest.fn().mockReturnValue('Custom recovery')
      };

      manager.addStrategy(customStrategy);

      const error: EnhancedTemplateError = {
        ...mockError,
        type: 'validation'
      };

      // Custom strategy should be checked first (added to beginning)
      expect(customStrategy.canRecover).not.toHaveBeenCalled();
      
      // Trigger recovery attempt
      manager.attemptRecovery(error);
      
      expect(customStrategy.canRecover).toHaveBeenCalledWith(error);
    });
  });

  describe('TemplateErrorFeedbackManager', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show error feedback with appropriate severity', () => {
      const criticalError: EnhancedTemplateError = {
        ...mockError,
        severity: 'critical',
        message: 'Critical security error'
      };

      TemplateErrorFeedbackManager.showErrorFeedback(criticalError);

      expect(toast.error).toHaveBeenCalledWith(
        'Template-Fehler',
        expect.objectContaining({
          description: expect.stringContaining('Critical security error')
        })
      );
    });

    it('should show warning for medium severity errors', () => {
      const mediumError: EnhancedTemplateError = {
        ...mockError,
        severity: 'medium',
        message: 'Medium severity error'
      };

      TemplateErrorFeedbackManager.showErrorFeedback(mediumError);

      expect(toast.warning).toHaveBeenCalledWith(
        'Template-Warnung',
        expect.objectContaining({
          description: expect.stringContaining('Medium severity error')
        })
      );
    });

    it('should include recovery actions in feedback', () => {
      const errorWithActions: EnhancedTemplateError = {
        ...mockError,
        message: 'Error message',
        recoveryActions: ['Action 1', 'Action 2', 'Action 3', 'Action 4']
      };

      TemplateErrorFeedbackManager.showErrorFeedback(errorWithActions, {
        showRecoveryActions: true
      });

      expect(toast.warning).toHaveBeenCalledWith(
        'Template-Warnung',
        expect.objectContaining({
          description: expect.stringMatching(/Lösungsvorschläge:[\s\S]*Action 1[\s\S]*Action 2[\s\S]*Action 3/)
        })
      );
    });

    it('should show retry action when allowed', () => {
      const retryableError: EnhancedTemplateError = {
        ...mockError,
        retryable: true
      };

      const onRetry = jest.fn();

      TemplateErrorFeedbackManager.showErrorFeedback(retryableError, {
        allowRetry: true,
        onRetry
      });

      expect(toast.warning).toHaveBeenCalledWith(
        'Template-Warnung',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Erneut versuchen',
            onClick: onRetry
          })
        })
      );
    });

    it('should show validation feedback for errors and warnings', () => {
      const validationResult: TemplateValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1', 'Warning 2'],
        placeholders: []
      };

      TemplateErrorFeedbackManager.showValidationFeedback(validationResult, {
        showWarnings: true
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Validierungsfehler',
        expect.objectContaining({
          description: expect.stringContaining('2 Validierungsfehler gefunden')
        })
      );

      expect(toast.warning).toHaveBeenCalledWith(
        'Template-Warnungen',
        expect.objectContaining({
          description: expect.stringContaining('2 Warnungen')
        })
      );
    });

    it('should show success feedback for valid templates', () => {
      const validResult: TemplateValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        placeholders: ['@mieter.name', '@datum']
      };

      TemplateErrorFeedbackManager.showValidationFeedback(validResult);

      expect(toast.success).toHaveBeenCalledWith(
        'Template-Validierung erfolgreich',
        expect.objectContaining({
          description: expect.stringContaining('Template ist gültig mit 2 Platzhaltern')
        })
      );
    });

    it('should show recovery success feedback', () => {
      TemplateErrorFeedbackManager.showRecoverySuccess(
        'AutoCorrectionStrategy',
        'Placeholder corrected'
      );

      expect(toast.success).toHaveBeenCalledWith(
        'Automatische Wiederherstellung',
        expect.objectContaining({
          description: 'Placeholder corrected (AutoCorrectionStrategy)'
        })
      );
    });
  });
});