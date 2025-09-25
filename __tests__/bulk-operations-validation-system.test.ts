import { ValidationService, validationService, ValidationRuleBuilders } from '@/lib/bulk-operations-validation'
import { BulkOperation, ValidationResult, ValidationRule, TableType } from '@/types/bulk-operations'

// Mock fetch
global.fetch = jest.fn()

describe('ValidationService', () => {
  let service: ValidationService

  beforeEach(() => {
    service = ValidationService.getInstance()
    service.clearCache()
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ValidationService.getInstance()
      const instance2 = ValidationService.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should export a singleton instance', () => {
      expect(validationService).toBeInstanceOf(ValidationService)
      expect(validationService).toBe(ValidationService.getInstance())
    })
  })

  describe('validateBulkOperation', () => {
    const mockOperation: BulkOperation = {
      id: 'test-operation',
      label: 'Test Operation',
      requiresConfirmation: true,
      component: () => null,
      validationRules: [
        {
          field: 'name',
          validator: (value: any) => value !== null && value !== '',
          message: 'Name is required'
        },
        {
          field: 'status',
          validator: (value: any) => ['active', 'inactive'].includes(value),
          message: 'Status must be active or inactive'
        }
      ]
    }

    const mockRecords = [
      { id: '1', name: 'Test 1', status: 'active', user_id: 'user1' },
      { id: '2', name: '', status: 'active', user_id: 'user1' },
      { id: '3', name: 'Test 3', status: 'invalid', user_id: 'user1' }
    ]

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })
    })

    it('should validate records successfully', async () => {
      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2', '3'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1'])
      expect(result.invalidIds).toEqual(['2', '3'])
      expect(result.errors).toHaveLength(2)
      expect(result.isValid).toBe(false)
    })

    it('should return all valid when all records pass validation', async () => {
      const validRecords = [
        { id: '1', name: 'Test 1', status: 'active', user_id: 'user1' },
        { id: '2', name: 'Test 2', status: 'inactive', user_id: 'user1' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: validRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1', '2'])
      expect(result.invalidIds).toEqual([])
      expect(result.errors).toHaveLength(0)
      expect(result.isValid).toBe(true)
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.isValid).toBe(false)
      expect(result.validIds).toEqual([])
      expect(result.invalidIds).toEqual(['1', '2'])
      expect(result.errors).toHaveLength(2)
      expect(result.errors[0].message).toContain('Network error')
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Bad Request'
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.isValid).toBe(false)
      expect(result.invalidIds).toEqual(['1', '2'])
    })

    it('should cache validation results', async () => {
      // First call
      await service.validateBulkOperation(mockOperation, ['1'], 'wohnungen')
      
      // Second call with same parameters
      await service.validateBulkOperation(mockOperation, ['1'], 'wohnungen')

      // Should only fetch once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should include operation data in validation', async () => {
      const operationData = { targetValue: 'test' }
      
      await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen',
        operationData
      )

      expect(global.fetch).toHaveBeenCalledWith('/api/bulk-operations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedIds: ['1'],
          tableType: 'wohnungen'
        })
      })
    })
  })

  describe('validateRealTime', () => {
    const mockOperation: BulkOperation = {
      id: 'test-operation',
      label: 'Test Operation',
      requiresConfirmation: true,
      component: () => null,
    }

    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: [] })
      })
    })

    it('should perform validation and clear cache after delay', async () => {
      jest.useFakeTimers()
      
      const result = await service.validateRealTime(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result).toBeDefined()
      
      // Fast-forward time to trigger cache clearing
      jest.advanceTimersByTime(5000)
      
      // Second call should fetch again
      await service.validateRealTime(mockOperation, ['1'], 'wohnungen')
      
      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      jest.useRealTimers()
    })
  })

  describe('Validation Rules Execution', () => {
    it('should execute synchronous validation rules', async () => {
      const mockRule: ValidationRule = {
        field: 'test',
        validator: (value: any) => value === 'valid',
        message: 'Value must be valid'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [
        { id: '1', test: 'valid' },
        { id: '2', test: 'invalid' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1'])
      expect(result.invalidIds).toEqual(['2'])
    })

    it('should execute asynchronous validation rules', async () => {
      const mockRule: ValidationRule = {
        field: 'test',
        validator: async (value: any) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return value === 'valid'
        },
        message: 'Value must be valid'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [
        { id: '1', test: 'valid' },
        { id: '2', test: 'invalid' }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1'])
      expect(result.invalidIds).toEqual(['2'])
    })

    it('should handle validation rule errors', async () => {
      const mockRule: ValidationRule = {
        field: 'test',
        validator: () => {
          throw new Error('Validation rule error')
        },
        message: 'Value must be valid'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [{ id: '1', test: 'value' }]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result.validIds).toEqual([])
      expect(result.invalidIds).toEqual(['1'])
      expect(result.errors[0].message).toContain('Validation rule error')
    })

    it('should handle custom error messages from validators', async () => {
      const mockRule: ValidationRule = {
        field: 'test',
        validator: (value: any) => 'Custom error message',
        message: 'Default message'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [{ id: '1', test: 'value' }]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result.errors[0].message).toBe('Custom error message')
    })
  })

  describe('Field Value Extraction', () => {
    it('should extract simple field values', async () => {
      const mockRule: ValidationRule = {
        field: 'name',
        validator: (value: any) => value === 'test',
        message: 'Name must be test'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [{ id: '1', name: 'test' }]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1'])
    })

    it('should extract nested field values using dot notation', async () => {
      const mockRule: ValidationRule = {
        field: 'user.profile.name',
        validator: (value: any) => value === 'test',
        message: 'User profile name must be test'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [
        { id: '1', user: { profile: { name: 'test' } } }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result.validIds).toEqual(['1'])
    })

    it('should handle missing nested fields gracefully', async () => {
      const mockRule: ValidationRule = {
        field: 'user.profile.name',
        validator: (value: any) => value !== undefined,
        message: 'User profile name is required'
      }

      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
        validationRules: [mockRule]
      }

      const mockRecords = [
        { id: '1', user: {} } // Missing profile.name
      ]

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: mockRecords })
      })

      const result = await service.validateBulkOperation(
        mockOperation,
        ['1'],
        'wohnungen'
      )

      expect(result.invalidIds).toEqual(['1'])
    })
  })

  describe('getValidationSummary', () => {
    it('should return correct summary for all valid records', () => {
      const result: ValidationResult = {
        isValid: true,
        validIds: ['1', '2', '3'],
        invalidIds: [],
        errors: []
      }

      const summary = service.getValidationSummary(result)

      expect(summary.canProceed).toBe(true)
      expect(summary.message).toContain('All 3 selected records are valid')
      expect(summary.details).toHaveLength(0)
    })

    it('should return correct summary for partial validation', () => {
      const result: ValidationResult = {
        isValid: false,
        validIds: ['1', '2'],
        invalidIds: ['3'],
        errors: [
          { id: '3', field: 'name', message: 'Name is required' }
        ]
      }

      const summary = service.getValidationSummary(result)

      expect(summary.canProceed).toBe(true)
      expect(summary.message).toContain('2 of 3 records can be updated')
      expect(summary.details).toHaveLength(1)
      expect(summary.details[0]).toContain('Name is required (1 record)')
    })

    it('should return correct summary for no valid records', () => {
      const result: ValidationResult = {
        isValid: false,
        validIds: [],
        invalidIds: ['1', '2'],
        errors: [
          { id: '1', field: 'name', message: 'Name is required' },
          { id: '2', field: 'name', message: 'Name is required' }
        ]
      }

      const summary = service.getValidationSummary(result)

      expect(summary.canProceed).toBe(false)
      expect(summary.message).toContain('None of the selected records can be updated')
      expect(summary.details).toHaveLength(1)
      expect(summary.details[0]).toContain('Name is required (2 records)')
    })

    it('should group errors by message', () => {
      const result: ValidationResult = {
        isValid: false,
        validIds: [],
        invalidIds: ['1', '2', '3'],
        errors: [
          { id: '1', field: 'name', message: 'Name is required' },
          { id: '2', field: 'name', message: 'Name is required' },
          { id: '3', field: 'status', message: 'Invalid status' }
        ]
      }

      const summary = service.getValidationSummary(result)

      expect(summary.details).toHaveLength(2)
      expect(summary.details).toContain('Name is required (2 records)')
      expect(summary.details).toContain('Invalid status (1 record)')
    })
  })

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockOperation: BulkOperation = {
        id: 'test',
        label: 'Test',
        requiresConfirmation: true,
        component: () => null,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ records: [] })
      })

      // First call
      await service.validateBulkOperation(mockOperation, ['1'], 'wohnungen')
      
      // Clear cache
      service.clearCache()
      
      // Second call should fetch again
      await service.validateBulkOperation(mockOperation, ['1'], 'wohnungen')

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })
})

describe('ValidationRuleBuilders', () => {
  describe('required', () => {
    it('should create a required validation rule', () => {
      const rule = ValidationRuleBuilders.required('name')
      
      expect(rule.field).toBe('name')
      expect(rule.message).toBe('name is required')
      expect(rule.validator('test')).toBe(true)
      expect(rule.validator('')).toBe(false)
      expect(rule.validator(null)).toBe(false)
      expect(rule.validator(undefined)).toBe(false)
    })

    it('should accept custom message', () => {
      const rule = ValidationRuleBuilders.required('name', 'Custom message')
      
      expect(rule.message).toBe('Custom message')
    })
  })

  describe('oneOf', () => {
    it('should create a oneOf validation rule', () => {
      const rule = ValidationRuleBuilders.oneOf('status', ['active', 'inactive'])
      
      expect(rule.field).toBe('status')
      expect(rule.validator('active')).toBe(true)
      expect(rule.validator('inactive')).toBe(true)
      expect(rule.validator('invalid')).toBe(false)
    })

    it('should accept custom message', () => {
      const rule = ValidationRuleBuilders.oneOf('status', ['active'], 'Custom message')
      
      expect(rule.message).toBe('Custom message')
    })
  })

  describe('custom', () => {
    it('should create a custom validation rule', () => {
      const customValidator = (value: any) => value > 10
      const rule = ValidationRuleBuilders.custom('age', customValidator, 'Age must be greater than 10')
      
      expect(rule.field).toBe('age')
      expect(rule.message).toBe('Age must be greater than 10')
      expect(rule.validator(15)).toBe(true)
      expect(rule.validator(5)).toBe(false)
    })
  })

  describe('ownership', () => {
    it('should create an ownership validation rule', () => {
      const rule = ValidationRuleBuilders.ownership()
      
      expect(rule.field).toBe('user_id')
      expect(rule.message).toBe('You do not have permission to modify this record')
    })

    it('should accept custom field and message', () => {
      const rule = ValidationRuleBuilders.ownership('owner_id', 'Custom ownership message')
      
      expect(rule.field).toBe('owner_id')
      expect(rule.message).toBe('Custom ownership message')
    })
  })

  describe('foreignKey', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockClear()
    })

    it('should create a foreign key validation rule', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: () => Promise.resolve({ exists: true })
      })

      const rule = ValidationRuleBuilders.foreignKey('house_id', 'haeuser')
      
      expect(rule.field).toBe('house_id')
      expect(rule.message).toBe('Invalid house_id reference')
      
      const result = await rule.validator('valid-id')
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('/api/bulk-operations/validate-foreign-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 'valid-id', tableType: 'haeuser' })
      })
    })

    it('should return false for empty values', async () => {
      const rule = ValidationRuleBuilders.foreignKey('house_id', 'haeuser')
      
      const result = await rule.validator(null)
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const rule = ValidationRuleBuilders.foreignKey('house_id', 'haeuser')
      
      const result = await rule.validator('test-id')
      expect(result).toBe(false)
    })

    it('should accept custom message', () => {
      const rule = ValidationRuleBuilders.foreignKey('house_id', 'haeuser', 'Custom foreign key message')
      
      expect(rule.message).toBe('Custom foreign key message')
    })
  })
})