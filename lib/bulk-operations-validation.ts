'use client'

import { 
  ValidationRule, 
  ValidationResult, 
  ValidationError, 
  TableType,
  BulkOperation 
} from '@/types/bulk-operations'

/**
 * ValidationService provides rule-based validation for bulk operations
 * Supports real-time validation feedback and partial operation execution
 */
export class ValidationService {
  private static instance: ValidationService
  private validationCache = new Map<string, ValidationResult>()

  private constructor() {}

  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService()
    }
    return ValidationService.instance
  }

  /**
   * Validates selected records against operation rules
   */
  async validateBulkOperation(
    operation: BulkOperation,
    selectedIds: string[],
    tableType: TableType,
    operationData?: any
  ): Promise<ValidationResult> {
    const cacheKey = this.getCacheKey(operation.id, selectedIds, tableType, operationData)
    
    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!
    }

    try {
      // Fetch records for validation
      const records = await this.fetchRecordsForValidation(selectedIds, tableType)
      
      // Apply validation rules
      const result = await this.applyValidationRules(
        operation,
        records,
        operationData
      )

      // Cache result for performance
      this.validationCache.set(cacheKey, result)
      
      return result
    } catch (error) {
      const errorResult: ValidationResult = {
        isValid: false,
        validIds: [],
        invalidIds: selectedIds,
        errors: selectedIds.map(id => ({
          id,
          field: 'general',
          message: error instanceof Error ? error.message : 'Validation failed'
        }))
      }
      
      return errorResult
    }
  }

  /**
   * Validates records in real-time as user selects operation
   */
  async validateRealTime(
    operation: BulkOperation,
    selectedIds: string[],
    tableType: TableType,
    operationData?: any
  ): Promise<ValidationResult> {
    // For real-time validation, we use a shorter cache TTL
    const result = await this.validateBulkOperation(operation, selectedIds, tableType, operationData)
    
    // Clear cache after short delay for real-time updates
    setTimeout(() => {
      const cacheKey = this.getCacheKey(operation.id, selectedIds, tableType, operationData)
      this.validationCache.delete(cacheKey)
    }, 5000) // 5 second cache for real-time validation
    
    return result
  }

  /**
   * Applies validation rules to records
   */
  private async applyValidationRules(
    operation: BulkOperation,
    records: Record<string, any>[],
    operationData?: any
  ): Promise<ValidationResult> {
    const validIds: string[] = []
    const invalidIds: string[] = []
    const errors: ValidationError[] = []

    // Get validation rules for the operation
    const rules = this.getValidationRules(operation)

    for (const record of records) {
      const recordId = record.id
      let isRecordValid = true
      const recordErrors: ValidationError[] = []

      // Apply each validation rule
      for (const rule of rules) {
        try {
          const validationResult = await this.executeValidationRule(rule, record, operationData)
          
          if (validationResult !== true) {
            isRecordValid = false
            recordErrors.push({
              id: recordId,
              field: rule.field,
              message: typeof validationResult === 'string' ? validationResult : rule.message
            })
          }
        } catch (error) {
          isRecordValid = false
          recordErrors.push({
            id: recordId,
            field: rule.field,
            message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }

      if (isRecordValid) {
        validIds.push(recordId)
      } else {
        invalidIds.push(recordId)
        errors.push(...recordErrors)
      }
    }

    return {
      isValid: invalidIds.length === 0,
      validIds,
      invalidIds,
      errors
    }
  }

  /**
   * Executes a single validation rule
   */
  private async executeValidationRule(
    rule: ValidationRule,
    record: any,
    operationData?: any
  ): Promise<boolean | string> {
    try {
      // Get the field value from the record
      const fieldValue = this.getFieldValue(record, rule.field)
      
      // Execute the validator function
      const result = await rule.validator(fieldValue, record, operationData)
      
      return result
    } catch (error) {
      return `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * Gets validation rules for an operation
   */
  private getValidationRules(operation: BulkOperation): ValidationRule[] {
    const rules: ValidationRule[] = []

    // Add operation-specific validation rules
    if (operation.validationRules) {
      rules.push(...operation.validationRules)
    }

    // Add common validation rules based on operation type
    rules.push(...this.getCommonValidationRules(operation))

    return rules
  }

  /**
   * Gets common validation rules for all operations
   */
  private getCommonValidationRules(operation: BulkOperation): ValidationRule[] {
    const commonRules: ValidationRule[] = []

    // Record existence validation
    commonRules.push({
      field: 'id',
      validator: (value: any, record: any) => {
        return !!record && !!value
      },
      message: 'Record not found or invalid'
    })

    // User permission validation (placeholder - would integrate with actual permission system)
    commonRules.push({
      field: 'user_id',
      validator: (value: any, record: any) => {
        // This would integrate with your actual permission system
        return true // Placeholder
      },
      message: 'Insufficient permissions for this record'
    })

    return commonRules
  }

  /**
   * Fetches records for validation
   */
  private async fetchRecordsForValidation(
    selectedIds: string[],
    tableType: TableType
  ): Promise<Record<string, any>[]> {
    try {
      const response = await fetch('/api/bulk-operations/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedIds,
          tableType
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.statusText}`)
      }

      const data = await response.json()
      return data.records || []
    } catch (error) {
      throw new Error(`Failed to fetch records for validation: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets field value from record using dot notation
   */
  private getFieldValue(record: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], record)
  }

  /**
   * Generates cache key for validation results
   */
  private getCacheKey(
    operationId: string,
    selectedIds: string[],
    tableType: TableType,
    operationData?: any
  ): string {
    const sortedIds = [...selectedIds].sort()
    const dataHash = operationData ? JSON.stringify(operationData) : ''
    return `${operationId}-${tableType}-${sortedIds.join(',')}-${dataHash}`
  }

  /**
   * Clears validation cache
   */
  clearCache(): void {
    this.validationCache.clear()
  }

  /**
   * Gets validation summary for UI display
   */
  getValidationSummary(result: ValidationResult): {
    canProceed: boolean
    message: string
    details: string[]
  } {
    const { isValid, validIds, invalidIds, errors } = result
    
    if (isValid) {
      return {
        canProceed: true,
        message: `All ${validIds.length} selected records are valid for this operation.`,
        details: []
      }
    }

    const canProceed = validIds.length > 0
    const validCount = validIds.length
    const invalidCount = invalidIds.length
    
    let message: string
    if (canProceed) {
      message = `${validCount} of ${validCount + invalidCount} records can be updated. ${invalidCount} records will be skipped.`
    } else {
      message = `None of the selected records can be updated. Please review the validation errors.`
    }

    // Group errors by message for cleaner display
    const errorGroups = new Map<string, string[]>()
    errors.forEach(error => {
      if (!errorGroups.has(error.message)) {
        errorGroups.set(error.message, [])
      }
      errorGroups.get(error.message)!.push(error.id)
    })

    const details = Array.from(errorGroups.entries()).map(([message, ids]) => {
      if (ids.length === 1) {
        return `${message} (1 record)`
      }
      return `${message} (${ids.length} records)`
    })

    return {
      canProceed,
      message,
      details
    }
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance()

// Validation rule builders for common scenarios
export const ValidationRuleBuilders = {
  /**
   * Creates a rule that validates a field is not empty
   */
  required: (field: string, message?: string): ValidationRule => ({
    field,
    validator: (value: any) => {
      return value !== null && value !== undefined && value !== ''
    },
    message: message || `${field} is required`
  }),

  /**
   * Creates a rule that validates a field matches one of the allowed values
   */
  oneOf: (field: string, allowedValues: any[], message?: string): ValidationRule => ({
    field,
    validator: (value: any) => {
      return allowedValues.includes(value)
    },
    message: message || `${field} must be one of: ${allowedValues.join(', ')}`
  }),

  /**
   * Creates a rule that validates a field using a custom function
   */
  custom: (field: string, validator: (value: any, record: any, operationData?: any) => boolean | string | Promise<boolean | string>, message: string): ValidationRule => ({
    field,
    validator,
    message
  }),

  /**
   * Creates a rule that validates record ownership
   */
  ownership: (field: string = 'user_id', message?: string): ValidationRule => ({
    field,
    validator: async (value: any, record: any) => {
      // This would integrate with your actual user context
      // For now, return true as placeholder
      return true
    },
    message: message || 'You do not have permission to modify this record'
  }),

  /**
   * Creates a rule that validates foreign key relationships
   */
  foreignKey: (field: string, tableType: TableType, message?: string): ValidationRule => ({
    field,
    validator: async (value: any) => {
      if (!value) return false
      
      try {
        const response = await fetch(`/api/bulk-operations/validate-foreign-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, tableType })
        })
        
        const result = await response.json()
        return result.exists
      } catch {
        return false
      }
    },
    message: message || `Invalid ${field} reference`
  })
}