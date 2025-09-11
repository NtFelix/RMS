/**
 * Tests for template validation and user guidance improvements
 * Task 5.3: Improve validation and user guidance
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Import components to test
import { ValidationFeedback, FieldValidationWrapper, ValidationProgress } from '../components/template-validation-feedback'
import { GuidanceTooltip, ContextualHelp, SmartGuidance } from '../components/template-guidance-tooltips'
import { 
  AccessibleFormField, 
  ValidationAnnouncer, 
  ScreenReaderOnly,
  LiveRegion 
} from '../components/template-accessibility'
import { ValidatedInput } from '../components/template-form-validation'
import { useTemplateValidation, useFieldValidation } from '../hooks/use-template-validation'
import { realTimeValidator } from '../lib/template-real-time-validation'

// Mock the validation system
jest.mock('../lib/template-real-time-validation', () => ({
  realTimeValidator: {
    validateTitle: jest.fn(),
    validateContent: jest.fn(),
    validateCategory: jest.fn(),
    validateVariables: jest.fn(),
    validateCompleteTemplate: jest.fn()
  }
}))

// Mock the template variables
jest.mock('../lib/template-variables', () => ({
  getVariableById: jest.fn(),
  isValidVariableId: jest.fn(),
  PREDEFINED_VARIABLES: []
}))

describe('Template Validation and Guidance System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Real-time Validation', () => {
    it('should validate title input in real-time', async () => {
      const mockValidateTitle = realTimeValidator.validateTitle as jest.Mock
      mockValidateTitle.mockResolvedValue({
        isValid: false,
        errors: [{
          field: 'title',
          message: 'Titel ist zu kurz',
          code: 'TITLE_TOO_SHORT',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      })

      const user = userEvent.setup()
      const onChange = jest.fn()

      render(
        <ValidatedInput
          value=""
          onChange={onChange}
          fieldName="title"
          label="Titel"
          required={true}
        />
      )

      const input = screen.getByLabelText(/titel/i)
      
      await user.type(input, 'A')
      
      await waitFor(() => {
        expect(mockValidateTitle).toHaveBeenCalledWith('A', undefined)
      })

      await waitFor(() => {
        expect(screen.getByText('Titel ist zu kurz')).toBeInTheDocument()
      })
    })

    it('should show validation progress indicator', async () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Titel fehlt',
            code: 'TITLE_REQUIRED',
            severity: 'error' as const
          }
        ],
        warnings: [
          {
            field: 'content',
            message: 'Inhalt ist leer',
            code: 'CONTENT_EMPTY',
            severity: 'warning' as const
          }
        ],
        suggestions: []
      }

      render(<ValidationProgress result={validationResult} />)

      expect(screen.getByText(/validierung/i)).toBeInTheDocument()
      expect(screen.getByText(/1 fehler/i)).toBeInTheDocument()
      expect(screen.getByText(/1 warnungen/i)).toBeInTheDocument()
    })

    it('should provide quick fix suggestions for errors', async () => {
      const onQuickFix = jest.fn()
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Titel bereits vorhanden',
            code: 'TITLE_DUPLICATE',
            severity: 'error' as const,
            quickFix: {
              label: 'Titel ändern',
              action: () => {},
              description: 'Fügen Sie eine Nummer hinzu'
            }
          }
        ],
        warnings: [],
        suggestions: []
      }

      render(
        <ValidationFeedback
          result={validationResult}
          onQuickFix={onQuickFix}
        />
      )

      const quickFixButton = screen.getByText('Titel ändern')
      expect(quickFixButton).toBeInTheDocument()

      await userEvent.click(quickFixButton)
      expect(onQuickFix).toHaveBeenCalledWith(validationResult.errors[0])
    })
  })

  describe('Visual Feedback', () => {
    it('should highlight fields with errors', () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Titel ist erforderlich',
            code: 'TITLE_REQUIRED',
            severity: 'error' as const
          }
        ],
        warnings: [],
        suggestions: []
      }

      render(
        <FieldValidationWrapper
          result={validationResult}
          fieldName="title"
          showInlineIndicator={true}
        >
          <input data-testid="test-input" />
        </FieldValidationWrapper>
      )

      const wrapper = screen.getByTestId('test-input').parentElement
      expect(wrapper).toHaveClass('border-red-300')
    })

    it('should show inline validation indicators', () => {
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Fehler',
            code: 'ERROR',
            severity: 'error' as const
          }
        ],
        warnings: [],
        suggestions: []
      }

      render(
        <FieldValidationWrapper
          result={validationResult}
          fieldName="title"
          showInlineIndicator={true}
        >
          <input />
        </FieldValidationWrapper>
      )

      // Should show error icon
      expect(document.querySelector('.text-red-500')).toBeInTheDocument()
    })
  })

  describe('Guidance Tooltips', () => {
    it('should show contextual help tooltips', async () => {
      render(
        <GuidanceTooltip
          title="Hilfe"
          content="Dies ist ein Hilfetext"
          type="info"
        >
          <button>Hilfe</button>
        </GuidanceTooltip>
      )

      const button = screen.getByText('Hilfe')
      await userEvent.hover(button)

      await waitFor(() => {
        expect(screen.getByText('Dies ist ein Hilfetext')).toBeInTheDocument()
      })
    })

    it('should provide contextual help for different topics', () => {
      render(<ContextualHelp topic="template-title" />)

      const helpButton = screen.getByRole('button')
      expect(helpButton).toBeInTheDocument()
    })

    it('should show smart guidance based on context', () => {
      render(
        <SmartGuidance
          context="new-template"
          userLevel="beginner"
        />
      )

      expect(screen.getByText(/neue vorlage erstellen/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility Features', () => {
    it('should provide screen reader announcements for validation changes', async () => {
      const { rerender } = render(
        <ValidationAnnouncer
          errors={[]}
          warnings={[]}
          fieldName="Titel"
        />
      )

      // Add an error
      rerender(
        <ValidationAnnouncer
          errors={['Titel ist erforderlich']}
          warnings={[]}
          fieldName="Titel"
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/titel.*neue fehler/i)).toBeInTheDocument()
      })
    })

    it('should provide proper ARIA attributes for form fields', () => {
      render(
        <AccessibleFormField
          label="Test Label"
          description="Test Description"
          error="Test Error"
          fieldId="test-field"
          required={true}
        >
          <input />
        </AccessibleFormField>
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('should provide screen reader only content', () => {
      render(
        <ScreenReaderOnly>
          Nur für Screenreader
        </ScreenReaderOnly>
      )

      const element = screen.getByText('Nur für Screenreader')
      expect(element).toHaveClass('sr-only')
    })

    it('should announce dynamic content changes', () => {
      render(
        <LiveRegion politeness="assertive">
          Wichtige Änderung
        </LiveRegion>
      )

      const region = screen.getByText('Wichtige Änderung')
      expect(region).toHaveAttribute('aria-live', 'assertive')
    })
  })

  describe('Form Validation Hook', () => {
    it('should manage form validation state', async () => {
      const TestComponent = () => {
        const {
          formData,
          updateField,
          validationResults,
          isFormValid,
          isValidating
        } = useTemplateValidation({
          title: '',
          content: null,
          category: ''
        })

        return (
          <div>
            <div data-testid="form-valid">{isFormValid().toString()}</div>
            <div data-testid="validating">{isValidating.toString()}</div>
            <button onClick={() => updateField('title', 'Test Title')}>
              Update Title
            </button>
          </div>
        )
      }

      render(<TestComponent />)

      expect(screen.getByTestId('form-valid')).toHaveTextContent('true')
      expect(screen.getByTestId('validating')).toHaveTextContent('false')
    })
  })

  describe('Variable Validation', () => {
    it('should validate template variables', async () => {
      const mockValidateVariables = realTimeValidator.validateVariables as jest.Mock
      mockValidateVariables.mockResolvedValue({
        isValid: false,
        errors: [
          {
            field: 'variables',
            message: 'Ungültige Variable: invalid_var',
            code: 'VARIABLE_INVALID',
            severity: 'error'
          }
        ],
        warnings: [],
        suggestions: []
      })

      const TestComponent = () => {
        const {
          value,
          updateValue,
          validationResult,
          isValidating
        } = useFieldValidation('variables', ['invalid_var'])

        return (
          <div>
            <div data-testid="validation-result">
              {validationResult.errors.map(error => error.message).join(', ')}
            </div>
            <div data-testid="validating">{isValidating.toString()}</div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('validation-result')).toHaveTextContent('Ungültige Variable: invalid_var')
      })
    })
  })

  describe('Error Highlighting', () => {
    it('should highlight variables with errors in content', () => {
      // This would test the TipTap editor integration
      // For now, we test the validation feedback component
      const validationResult = {
        isValid: false,
        errors: [
          {
            field: 'variables',
            message: 'Unbekannte Variable: unknown_var',
            code: 'VARIABLE_UNKNOWN',
            severity: 'error' as const,
            position: { start: 0, end: 1 }
          }
        ],
        warnings: [],
        suggestions: []
      }

      render(<ValidationFeedback result={validationResult} />)

      expect(screen.getByText(/unbekannte variable/i)).toBeInTheDocument()
      expect(screen.getByText(/position 0-1/i)).toBeInTheDocument()
    })
  })

  describe('Integration Tests', () => {
    it('should integrate validation with form fields', async () => {
      const user = userEvent.setup()
      
      render(
        <ValidatedInput
          value=""
          onChange={() => {}}
          fieldName="title"
          label="Titel"
          required={true}
          showGuidance={true}
        />
      )

      // Should show contextual help
      expect(screen.getByRole('button')).toBeInTheDocument()

      // Should show proper labels and descriptions
      expect(screen.getByLabelText(/titel/i)).toBeInTheDocument()
    })

    it('should provide comprehensive accessibility support', () => {
      render(
        <AccessibleFormField
          label="Template Title"
          description="Enter a descriptive title"
          error="Title is required"
          warning="Title is very short"
          fieldId="title-field"
          required={true}
        >
          <input />
        </AccessibleFormField>
      )

      const input = screen.getByRole('textbox')
      
      // Check ARIA attributes
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(input).toHaveAttribute('aria-describedby')

      // Check error and warning messages
      expect(screen.getByText('Title is required')).toBeInTheDocument()
      expect(screen.getByText('Title is very short')).toBeInTheDocument()

      // Check required indicator
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })
})

describe('Template Editor Modal Integration', () => {
  it('should integrate validation and guidance in the template editor', () => {
    // This would test the enhanced template editor modal
    // For now, we verify that the components can be rendered together
    const validationResult = {
      isValid: false,
      errors: [
        {
          field: 'title',
          message: 'Titel ist erforderlich',
          code: 'TITLE_REQUIRED',
          severity: 'error' as const
        }
      ],
      warnings: [],
      suggestions: []
    }

    render(
      <div>
        <ValidationProgress result={validationResult} />
        <ValidationFeedback result={validationResult} />
        <SmartGuidance context="new-template" userLevel="beginner" />
      </div>
    )

    expect(screen.getByText(/validierung/i)).toBeInTheDocument()
    expect(screen.getByText(/titel ist erforderlich/i)).toBeInTheDocument()
    expect(screen.getByText(/neue vorlage erstellen/i)).toBeInTheDocument()
  })
})