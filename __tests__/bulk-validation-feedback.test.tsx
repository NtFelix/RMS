import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BulkValidationFeedback } from '@/components/bulk-validation-feedback'
import { BulkOperation, ValidationResult } from '@/types/bulk-operations'
import { validationService } from '@/lib/bulk-operations-validation'

// Mock the validation service
jest.mock('@/lib/bulk-operations-validation', () => ({
  validationService: {
    validateRealTime: jest.fn(),
    getValidationSummary: jest.fn()
  }
}))

const mockValidationService = validationService as jest.Mocked<typeof validationService>

describe('BulkValidationFeedback', () => {
  const mockOperation: BulkOperation = {
    id: 'changeHaus',
    label: 'Change House',
    requiresConfirmation: true,
    component: jest.fn() as any
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when no operation is provided', () => {
    const { container } = render(
      <BulkValidationFeedback
        operation={null}
        selectedIds={['1', '2']}
        tableType="wohnungen"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when no table type is provided', () => {
    const { container } = render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType={null}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should not render when no selected IDs are provided', () => {
    const { container } = render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={[]}
        tableType="wohnungen"
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should show loading state during validation', async () => {
    // Mock validation service to return a promise that doesn't resolve immediately
    let resolveValidation: (result: ValidationResult) => void
    const validationPromise = new Promise<ValidationResult>((resolve) => {
      resolveValidation = resolve
    })
    
    mockValidationService.validateRealTime.mockReturnValue(validationPromise)

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
      />
    )

    // Wait for loading state to appear
    await waitFor(() => {
      expect(screen.getByText('Validating selected records...')).toBeInTheDocument()
    })

    // Resolve the validation
    const mockResult: ValidationResult = {
      isValid: true,
      validIds: ['1', '2'],
      invalidIds: [],
      errors: []
    }

    mockValidationService.getValidationSummary.mockReturnValue({
      canProceed: true,
      message: 'All 2 selected records are valid for this operation.',
      details: []
    })

    resolveValidation!(mockResult)

    await waitFor(() => {
      expect(screen.queryByText('Validating selected records...')).not.toBeInTheDocument()
    })
  })

  it('should display success message for valid records', async () => {
    const mockResult: ValidationResult = {
      isValid: true,
      validIds: ['1', '2'],
      invalidIds: [],
      errors: []
    }

    mockValidationService.validateRealTime.mockResolvedValue(mockResult)
    mockValidationService.getValidationSummary.mockReturnValue({
      canProceed: true,
      message: 'All 2 selected records are valid for this operation.',
      details: []
    })

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('All 2 selected records are valid for this operation.')).toBeInTheDocument()
    })

    // Should show valid badge
    expect(screen.getByText('2 valid')).toBeInTheDocument()
    expect(screen.queryByText('invalid')).not.toBeInTheDocument()
  })

  it('should display warning message for partial validation', async () => {
    const mockResult: ValidationResult = {
      isValid: false,
      validIds: ['1'],
      invalidIds: ['2'],
      errors: [
        { id: '2', field: 'user_id', message: 'Access denied' }
      ]
    }

    mockValidationService.validateRealTime.mockResolvedValue(mockResult)
    mockValidationService.getValidationSummary.mockReturnValue({
      canProceed: true,
      message: '1 of 2 records can be updated. 1 record will be skipped.',
      details: ['Access denied (1 record)']
    })

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('1 of 2 records can be updated. 1 record will be skipped.')).toBeInTheDocument()
    })

    // Should show both valid and invalid badges
    expect(screen.getByText('1 valid')).toBeInTheDocument()
    expect(screen.getByText('1 invalid')).toBeInTheDocument()
  })

  it('should display error message for complete validation failure', async () => {
    const mockResult: ValidationResult = {
      isValid: false,
      validIds: [],
      invalidIds: ['1', '2'],
      errors: [
        { id: '1', field: 'user_id', message: 'Access denied' },
        { id: '2', field: 'user_id', message: 'Access denied' }
      ]
    }

    mockValidationService.validateRealTime.mockResolvedValue(mockResult)
    mockValidationService.getValidationSummary.mockReturnValue({
      canProceed: false,
      message: 'None of the selected records can be updated. Please review the validation errors.',
      details: ['Access denied (2 records)']
    })

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('None of the selected records can be updated. Please review the validation errors.')).toBeInTheDocument()
    })

    // Should show only invalid badge
    expect(screen.queryByText('valid')).not.toBeInTheDocument()
    expect(screen.getByText('2 invalid')).toBeInTheDocument()
  })

  it('should call onValidationChange when validation result changes', async () => {
    const mockOnValidationChange = jest.fn()
    const mockResult: ValidationResult = {
      isValid: true,
      validIds: ['1', '2'],
      invalidIds: [],
      errors: []
    }

    mockValidationService.validateRealTime.mockResolvedValue(mockResult)
    mockValidationService.getValidationSummary.mockReturnValue({
      canProceed: true,
      message: 'All 2 selected records are valid for this operation.',
      details: []
    })

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
        onValidationChange={mockOnValidationChange}
      />
    )

    await waitFor(() => {
      expect(mockOnValidationChange).toHaveBeenCalledWith(mockResult)
    })
  })

  it('should handle validation errors gracefully', async () => {
    const mockOnValidationChange = jest.fn()
    
    mockValidationService.validateRealTime.mockRejectedValue(new Error('Validation failed'))

    render(
      <BulkValidationFeedback
        operation={mockOperation}
        selectedIds={['1', '2']}
        tableType="wohnungen"
        onValidationChange={mockOnValidationChange}
      />
    )

    await waitFor(() => {
      expect(mockOnValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          validIds: [],
          invalidIds: ['1', '2'],
          errors: expect.arrayContaining([
            expect.objectContaining({
              message: 'Validation failed. Please try again.'
            })
          ])
        })
      )
    })
  })
})