import { ValidationService, ValidationRuleBuilders } from '@/lib/bulk-operations-validation'
import { BulkOperation, ValidationResult } from '@/types/bulk-operations'

// Mock fetch for testing
global.fetch = jest.fn()

describe('ValidationService', () => {
  let validationService: ValidationService
  
  beforeEach(() => {
    validationService = ValidationService.getInstance()
    validationService.clearCache()
    jest.clearAllMocks()
  })

  describe('validateBulkOperation', () => {
    it('should validate records successfully when all rules pass', async () => {
      // Mock API response
      const mockRecords = [
        { id: '1', user_id: 'user1', haus_id: 'haus1' },
        { id: '2', user_id: 'user1', haus_id: 'haus2' }
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockRecords })
      })

      const operation: BulkOperation = {
        id: 'changeHaus',
        label: 'Change House',
        requiresConfirmation: true,
        validationRules: [
          ValidationRuleBuilders.required('id'),
          ValidationRuleBuilders.required('user_id')
        ],
        component: jest.fn() as any
      }

      const result = await validationService.validateBulkOperation(
        operation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.isValid).toBe(true)
      expect(result.validIds).toEqual(['1', '2'])
      expect(result.invalidIds).toEqual([])
      expect(result.errors).toEqual([])
    })

    it('should identify invalid records when validation rules fail', async () => {
      // Mock API response with one invalid record
      const mockRecords = [
        { id: '1', user_id: 'user1', haus_id: 'haus1' },
        { id: '2', user_id: null, haus_id: 'haus2' } // Invalid: missing user_id
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockRecords })
      })

      const operation: BulkOperation = {
        id: 'changeHaus',
        label: 'Change House',
        requiresConfirmation: true,
        validationRules: [
          ValidationRuleBuilders.required('id'),
          ValidationRuleBuilders.required('user_id')
        ],
        component: jest.fn() as any
      }

      const result = await validationService.validateBulkOperation(
        operation,
        ['1', '2'],
        'wohnungen'
      )

      expect(result.isValid).toBe(false)
      expect(result.validIds).toEqual(['1'])
      expect(result.invalidIds).toEqual(['2'])
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].id).toBe('2')
      expect(result.errors[0].field).toBe('user_id')
    })

    it('should handle custom validation rules', async () => {
      const mockRecords = [
        { id: '1', user_id: 'user1', haus_id: 'haus1' },
        { id: '2', user_id: 'user1', haus_id: 'haus1' } // Same house as target
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockRecords })
      })

      const operation: BulkOperation = {
        id: 'changeHaus',
        label: 'Change House',
        requiresConfirmation: true,
        validationRules: [
          ValidationRuleBuilders.custom(
            'haus_id',
            (value: any, record: any, operationData?: any) => {
              if (value === operationData?.hausId) {
                return 'Already assigned to this house'
              }
              return true
            },
            'Already assigned to target house'
          )
        ],
        component: jest.fn() as any
      }

      const result = await validationService.validateBulkOperation(
        operation,
        ['1', '2'],
        'wohnungen',
        { hausId: 'haus1' }
      )

      expect(result.isValid).toBe(false)
      expect(result.validIds).toEqual([])
      expect(result.invalidIds).toEqual(['1', '2'])
      expect(result.errors).toHaveLength(2)
    })

    it('should cache validation results', async () => {
      const mockRecords = [
        { id: '1', user_id: 'user1', haus_id: 'haus1' }
      ]

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ records: mockRecords })
      })

      const operation: BulkOperation = {
        id: 'changeHaus',
        label: 'Change House',
        requiresConfirmation: true,
        validationRules: [ValidationRuleBuilders.required('id')],
        component: jest.fn() as any
      }

      // First call
      await validationService.validateBulkOperation(
        operation,
        ['1'],
        'wohnungen'
      )

      // Second call should use cache
      const result = await validationService.validateBulkOperation(
        operation,
        ['1'],
        'wohnungen'
      )

      expect(fetch).toHaveBeenCalledTimes(1) // Only called once due to caching
      expect(result.isValid).toBe(true)
    })
  })

  describe('getValidationSummary', () => {
    it('should provide correct summary for valid results', () => {
      const result: ValidationResult = {
        isValid: true,
        validIds: ['1', '2', '3'],
        invalidIds: [],
        errors: []
      }

      const summary = validationService.getValidationSummary(result)

      expect(summary.canProceed).toBe(true)
      expect(summary.message).toContain('All 3 selected records are valid')
      expect(summary.details).toEqual([])
    })

    it('should provide correct summary for partial validation', () => {
      const result: ValidationResult = {
        isValid: false,
        validIds: ['1', '2'],
        invalidIds: ['3'],
        errors: [
          { id: '3', field: 'user_id', message: 'Access denied' }
        ]
      }

      const summary = validationService.getValidationSummary(result)

      expect(summary.canProceed).toBe(true)
      expect(summary.message).toContain('2 of 3 records can be updated')
      expect(summary.details).toHaveLength(1)
      expect(summary.details[0]).toContain('Access denied (1 record)')
    })

    it('should provide correct summary for complete validation failure', () => {
      const result: ValidationResult = {
        isValid: false,
        validIds: [],
        invalidIds: ['1', '2'],
        errors: [
          { id: '1', field: 'user_id', message: 'Access denied' },
          { id: '2', field: 'user_id', message: 'Access denied' }
        ]
      }

      const summary = validationService.getValidationSummary(result)

      expect(summary.canProceed).toBe(false)
      expect(summary.message).toContain('None of the selected records can be updated')
      expect(summary.details).toHaveLength(1)
      expect(summary.details[0]).toContain('Access denied (2 records)')
    })
  })
})

describe('ValidationRuleBuilders', () => {
  describe('required', () => {
    it('should pass for non-empty values', () => {
      const rule = ValidationRuleBuilders.required('test_field')
      
      expect(rule.validator('value', {})).toBe(true)
      expect(rule.validator(0, {})).toBe(true)
      expect(rule.validator(false, {})).toBe(true)
    })

    it('should fail for empty values', () => {
      const rule = ValidationRuleBuilders.required('test_field')
      
      expect(rule.validator(null, {})).toBe(false)
      expect(rule.validator(undefined, {})).toBe(false)
      expect(rule.validator('', {})).toBe(false)
    })
  })

  describe('oneOf', () => {
    it('should pass for allowed values', () => {
      const rule = ValidationRuleBuilders.oneOf('status', ['active', 'inactive'])
      
      expect(rule.validator('active', {})).toBe(true)
      expect(rule.validator('inactive', {})).toBe(true)
    })

    it('should fail for disallowed values', () => {
      const rule = ValidationRuleBuilders.oneOf('status', ['active', 'inactive'])
      
      expect(rule.validator('pending', {})).toBe(false)
      expect(rule.validator('deleted', {})).toBe(false)
    })
  })

  describe('custom', () => {
    it('should use custom validator function', () => {
      const rule = ValidationRuleBuilders.custom(
        'age',
        (value: number) => value >= 18 || 'Must be 18 or older',
        'Age validation failed'
      )
      
      expect(rule.validator(20, {})).toBe(true)
      expect(rule.validator(16, {})).toBe('Must be 18 or older')
    })
  })
})