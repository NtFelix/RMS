import {
  validateVariable,
  validateVariables,
  getSimilarVariables,
  validateTemplateContent,
  getVariableValidationClasses,
  getVariableValidationIcon,
  ValidationSeverity
} from '../../lib/template-variable-validation'

describe('Template Variable Validation', () => {
  describe('validateVariable', () => {
    it('should validate known variables as valid', () => {
      const result = validateVariable('tenant_name')
      
      expect(result.isValid).toBe(true)
      expect(result.variableId).toBe('tenant_name')
      expect(result.variable).toBeDefined()
      expect(result.variable?.label).toBe('Mieter Name')
    })

    it('should detect unknown variables', () => {
      const result = validateVariable('unknown_variable')
      
      expect(result.isValid).toBe(false)
      expect(result.severity).toBe(ValidationSeverity.ERROR)
      expect(result.message).toContain('Unbekannte Variable')
      expect(result.suggestions).toBeDefined()
    })

    it('should warn about variables requiring context', () => {
      const result = validateVariable('tenant_name')
      
      expect(result.isValid).toBe(true)
      expect(result.severity).toBe(ValidationSeverity.WARNING)
      expect(result.message).toContain('benötigt Kontext')
    })

    it('should validate context-free variables without warnings', () => {
      const result = validateVariable('current_date')
      
      expect(result.isValid).toBe(true)
      expect(result.severity).toBe(ValidationSeverity.INFO)
    })

    it('should detect invalid variable ID format', () => {
      const result = validateVariable('123invalid')
      
      expect(result.isValid).toBe(false)
      expect(result.severity).toBe(ValidationSeverity.ERROR)
      expect(result.message).toContain('Ungültiges Variablen-Format')
    })
  })

  describe('validateVariables', () => {
    it('should validate multiple variables', () => {
      const results = validateVariables(['tenant_name', 'current_date', 'unknown_var'])
      
      expect(results).toHaveLength(3)
      expect(results[0].variableId).toBe('tenant_name')
      expect(results[1].variableId).toBe('current_date')
      expect(results[2].variableId).toBe('unknown_var')
      expect(results[2].isValid).toBe(false)
    })
  })

  describe('getSimilarVariables', () => {
    it('should suggest similar variables for typos', () => {
      const suggestions = getSimilarVariables('tenant_nam')
      
      expect(suggestions).toContain('tenant_name')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should return empty array for completely unrelated input', () => {
      const suggestions = getSimilarVariables('xyz123')
      
      expect(suggestions).toEqual([])
    })
  })

  describe('validateTemplateContent', () => {
    it('should validate content with valid variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      const result = validateTemplateContent(content)
      
      expect(result.totalVariables).toBe(1)
      expect(result.validVariables).toBe(1)
      expect(result.invalidVariables).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid variables in content', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'invalid_variable', label: 'Invalid' }
              }
            ]
          }
        ]
      }

      const result = validateTemplateContent(content)
      
      expect(result.totalVariables).toBe(1)
      expect(result.validVariables).toBe(0)
      expect(result.invalidVariables).toBe(1)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle mixed valid and invalid variables', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'invalid_var', label: 'Invalid' }
              }
            ]
          }
        ]
      }

      const result = validateTemplateContent(content)
      
      expect(result.totalVariables).toBe(2)
      expect(result.validVariables).toBe(1)
      expect(result.invalidVariables).toBe(1)
    })
  })

  describe('getVariableValidationClasses', () => {
    it('should return error classes for invalid variables', () => {
      const classes = getVariableValidationClasses('invalid_variable')
      
      expect(classes).toContain('mention-error')
      expect(classes).toContain('border-red-500')
    })

    it('should return warning classes for context-dependent variables', () => {
      const classes = getVariableValidationClasses('tenant_name')
      
      expect(classes).toContain('mention-warning')
      expect(classes).toContain('border-yellow-500')
    })

    it('should return valid classes for context-free variables', () => {
      const classes = getVariableValidationClasses('current_date')
      
      expect(classes).toContain('mention-valid')
      expect(classes).toContain('border-green-500')
    })
  })

  describe('getVariableValidationIcon', () => {
    it('should return error icon for invalid variables', () => {
      const icon = getVariableValidationIcon('invalid_variable')
      expect(icon).toBe('❌')
    })

    it('should return warning icon for context-dependent variables', () => {
      const icon = getVariableValidationIcon('tenant_name')
      expect(icon).toBe('⚠️')
    })

    it('should return valid icon for context-free variables', () => {
      const icon = getVariableValidationIcon('current_date')
      expect(icon).toBe('✅')
    })
  })
})