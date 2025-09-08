/**
 * Unit Tests for Placeholder Validation
 */

import {
  TemplateValidator,
  RealTimeValidator,
  ValidationResult,
  TemplateValidationOptions,
  createValidator,
  createRealTimeValidator
} from '@/lib/template-system/placeholder-validation';
import { PlaceholderEngine, ContextType } from '@/lib/template-system/placeholder-engine';

describe('TemplateValidator', () => {
  let engine: PlaceholderEngine;
  let validator: TemplateValidator;

  beforeEach(() => {
    engine = new PlaceholderEngine();
    validator = new TemplateValidator(engine);
  });

  describe('validateTemplate', () => {
    it('should validate template with valid placeholders', () => {
      const content = 'Hallo @mieter.name, Ihre Miete beträgt @wohnung.miete.';
      const result = validator.validateTemplate(content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.placeholders).toEqual(['@mieter.name', '@wohnung.miete']);
    });

    it('should detect validation errors', () => {
      const content = 'Hallo @invalid.placeholder, heute ist @123invalid.';
      const result = validator.validateTemplate(content);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('unknown_placeholder');
    });

    it('should validate context requirements when enabled', () => {
      const content = 'Hallo @mieter.name, Wohnung: @wohnung.adresse';
      const options: TemplateValidationOptions = {
        requireContextValidation: true,
        availableContext: ['mieter'] // Missing 'wohnung' context
      };
      
      const result = validator.validateTemplate(content, options);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_context')).toBe(true);
    });

    it('should pass validation with sufficient context', () => {
      const content = 'Hallo @mieter.name, Wohnung: @wohnung.adresse';
      const options: TemplateValidationOptions = {
        requireContextValidation: true,
        availableContext: ['mieter', 'wohnung']
      };
      
      const result = validator.validateTemplate(content, options);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should provide warnings in strict mode', () => {
      const content = 'Test @ symbol and @mieter.namee (typo)';
      const options: TemplateValidationOptions = {
        strictMode: true
      };
      
      const result = validator.validateTemplate(content, options);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result = validator.validateTemplate('');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.placeholders).toHaveLength(0);
    });
  });

  describe('strict mode validation', () => {
    it('should detect potential typos in placeholder names', () => {
      const content = '@mieter.namee @wohnung.addresse'; // Typos in name and adresse
      const options: TemplateValidationOptions = { strictMode: true };
      
      const result = validator.validateTemplate(content, options);

      expect(result.warnings.length).toBeGreaterThan(0);
      const typoWarnings = result.warnings.filter(w => 
        w.message.includes('Tippfehler')
      );
      expect(typoWarnings.length).toBeGreaterThan(0);
    });

    it('should detect unused @ symbols', () => {
      const content = 'Email: test@example.com and standalone @';
      const options: TemplateValidationOptions = { strictMode: true };
      
      const result = validator.validateTemplate(content, options);

      const atWarnings = result.warnings.filter(w => 
        w.message.includes('@ Symbol')
      );
      expect(atWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestions', () => {
    it('should suggest context requirements for templates with placeholders', () => {
      const content = '@mieter.name @wohnung.adresse @haus.name';
      const suggestions = validator.getSuggestions(content);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Kontexte');
      expect(suggestions[0]).toContain('mieter');
      expect(suggestions[0]).toContain('wohnung');
      expect(suggestions[0]).toContain('haus');
    });

    it('should suggest using placeholders for empty templates', () => {
      const content = 'Just plain text without any placeholders';
      const suggestions = validator.getSuggestions(content);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('@');
    });

    it('should not suggest anything for templates with only date placeholders', () => {
      const content = 'Today is @datum';
      const suggestions = validator.getSuggestions(content);

      // Should still suggest context but only for date placeholders (no context needed)
      expect(suggestions.length).toBe(0);
    });
  });
});

describe('RealTimeValidator', () => {
  let engine: PlaceholderEngine;
  let realTimeValidator: RealTimeValidator;

  beforeEach(() => {
    engine = new PlaceholderEngine();
    realTimeValidator = new RealTimeValidator(engine);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('validateWithDebounce', () => {
    it('should debounce validation calls', () => {
      const callback = jest.fn();
      const content = '@mieter.name';
      const options: TemplateValidationOptions = {};

      // Make multiple rapid calls
      realTimeValidator.validateWithDebounce(content, options, callback, 300);
      realTimeValidator.validateWithDebounce(content, options, callback, 300);
      realTimeValidator.validateWithDebounce(content, options, callback, 300);

      // Should not have called callback yet
      expect(callback).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(300);

      // Should have called callback only once
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          placeholders: ['@mieter.name']
        })
      );
    });

    it('should cancel previous validation when new one is triggered', () => {
      const callback = jest.fn();
      const content1 = '@mieter.name';
      const content2 = '@invalid.placeholder';
      const options: TemplateValidationOptions = {};

      // First call
      realTimeValidator.validateWithDebounce(content1, options, callback, 300);
      
      // Advance time partially
      jest.advanceTimersByTime(150);
      
      // Second call should cancel first
      realTimeValidator.validateWithDebounce(content2, options, callback, 300);
      
      // Advance remaining time from first call
      jest.advanceTimersByTime(150);
      expect(callback).not.toHaveBeenCalled();
      
      // Advance time for second call
      jest.advanceTimersByTime(150);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Should have validated the second content
      const result = callback.mock.calls[0][0] as ValidationResult;
      expect(result.placeholders).toEqual(['@invalid.placeholder']);
    });

    it('should use custom delay', () => {
      const callback = jest.fn();
      const content = '@mieter.name';
      const options: TemplateValidationOptions = {};

      realTimeValidator.validateWithDebounce(content, options, callback, 500);

      jest.advanceTimersByTime(400);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    it('should cancel pending validation', () => {
      const callback = jest.fn();
      const content = '@mieter.name';
      const options: TemplateValidationOptions = {};

      realTimeValidator.validateWithDebounce(content, options, callback, 300);
      realTimeValidator.cancel();

      jest.advanceTimersByTime(300);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple cancel calls safely', () => {
      const callback = jest.fn();
      const content = '@mieter.name';
      const options: TemplateValidationOptions = {};

      realTimeValidator.validateWithDebounce(content, options, callback, 300);
      realTimeValidator.cancel();
      realTimeValidator.cancel(); // Should not throw

      jest.advanceTimersByTime(300);
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('utility functions', () => {
  let engine: PlaceholderEngine;

  beforeEach(() => {
    engine = new PlaceholderEngine();
  });

  describe('createValidator', () => {
    it('should create a TemplateValidator instance', () => {
      const validator = createValidator(engine);
      expect(validator).toBeInstanceOf(TemplateValidator);
    });

    it('should create validator that works with provided engine', () => {
      const validator = createValidator(engine);
      const result = validator.validateTemplate('@mieter.name');
      
      expect(result.isValid).toBe(true);
      expect(result.placeholders).toEqual(['@mieter.name']);
    });
  });

  describe('createRealTimeValidator', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a RealTimeValidator instance', () => {
      const validator = createRealTimeValidator(engine);
      expect(validator).toBeInstanceOf(RealTimeValidator);
    });

    it('should create validator that works with provided engine', () => {
      const validator = createRealTimeValidator(engine);
      const callback = jest.fn();
      
      validator.validateWithDebounce('@mieter.name', {}, callback, 300);
      jest.advanceTimersByTime(300);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          placeholders: ['@mieter.name']
        })
      );
    });
  });
});

describe('Levenshtein distance calculation', () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    const engine = new PlaceholderEngine();
    validator = new TemplateValidator(engine);
  });

  it('should detect similar placeholder names', () => {
    // Test with a typo that should be detected
    const content = '@mieter.namee'; // Extra 'e'
    const options: TemplateValidationOptions = { strictMode: true };
    
    const result = validator.validateTemplate(content, options);
    
    const typoWarnings = result.warnings.filter(w => 
      w.message.includes('Tippfehler') && w.message.includes('@mieter.name')
    );
    
    expect(typoWarnings.length).toBeGreaterThan(0);
  });

  it('should not suggest very different placeholders', () => {
    const content = '@completely.different';
    const options: TemplateValidationOptions = { strictMode: true };
    
    const result = validator.validateTemplate(content, options);
    
    // Should have unknown placeholder error but no typo suggestions
    expect(result.errors.some(e => e.type === 'unknown_placeholder')).toBe(true);
    
    const typoWarnings = result.warnings.filter(w => 
      w.message.includes('Tippfehler')
    );
    
    // Might have typo warnings but they shouldn't suggest very different placeholders
    if (typoWarnings.length > 0) {
      expect(typoWarnings[0].message).not.toContain('@mieter.name');
    }
  });
});