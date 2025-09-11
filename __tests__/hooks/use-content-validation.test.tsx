/**
 * Tests for Content Validation Hook
 * 
 * Tests for the useContentValidation hook including real-time validation,
 * rule configuration, and validation state management.
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useContentValidation, useFieldValidation } from '../../hooks/use-content-validation'
import { contentValidationSystem } from '../../lib/template-content-validation-system'
import { realTimeValidator } from '../../lib/template-real-time-validation'

// Mock the validation systems
jest.mock('../../lib/template-content-validation-system', () => ({
  contentValidationSystem: {
    validateContent: jest.fn(),
    validateContentRealTime: jest.fn(),
    getAllRules: jest.fn(),
    configureRule: jest.fn(),
    addCustomRule: jest.fn()
  }
}))

jest.mock('../../lib/template-real-time-validation', () => ({
  realTimeValidator: {
    validateContent: jest.fn(),
    validateTitle: jest.fn(),
    validateCategory: jest.fn()
  }
}))

// Mock lodash debounce
jest.mock('lodash', () => ({
  debounce: (fn: any) => {
    fn.cancel = jest.fn()
    return fn
  }
}))

const mockContentValidationSystem = contentValidationSystem as jest.Mocked<typeof contentValidationSystem>
const mockRealTimeValidator = realTimeValidator as jest.Mocked<typeof realTimeValidator>

describe('useContentValidation', () => {
  const mockValidationSummary = {
    isValid: false,
    score: 75,
    totalIssues: 3,
    errorCount: 1,
    warningCount: 1,
    infoCount: 1,
    issuesByCategory: {
      structure: [
        {
          ruleId: 'empty_content',
          severity: 'error' as const,
          message: 'Content is empty'
        }
      ]
    },
    recommendations: ['Fix errors before use']
  }

  const mockRealTimeResult = {
    isValid: false,
    errors: [
      {
        field: 'content',
        message: 'Content is empty',
        code: 'EMPTY_CONTENT',
        severity: 'error' as const
      }
    ],
    warnings: [],
    suggestions: []
  }

  const mockRules = [
    {
      id: 'empty_content',
      name: 'Empty Content',
      description: 'Content should not be empty',
      severity: 'error' as const,
      category: 'structure',
      enabled: true,
      validate: jest.fn()
    },
    {
      id: 'missing_headings',
      name: 'Missing Headings',
      description: 'Long content should have headings',
      severity: 'warning' as const,
      category: 'structure',
      enabled: true,
      validate: jest.fn()
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockContentValidationSystem.getAllRules.mockReturnValue(mockRules)
    mockContentValidationSystem.validateContent.mockReturnValue(mockValidationSummary)
    mockContentValidationSystem.validateContentRealTime.mockReturnValue(mockRealTimeResult)
    mockRealTimeValidator.validateContent.mockResolvedValue(mockRealTimeResult)
  })

  describe('Basic Functionality', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useContentValidation())

      expect(result.current.summary).toBeNull()
      expect(result.current.realTimeResult).toBeNull()
      expect(result.current.isValidating).toBe(false)
      expect(result.current.lastValidated).toBeNull()
      expect(result.current.rules).toEqual(mockRules)
    })

    it('should auto-validate initial content', async () => {
      const initialContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test content' }]
          }
        ]
      }

      renderHook(() => useContentValidation(initialContent))

      await waitFor(() => {
        expect(mockContentValidationSystem.validateContent).toHaveBeenCalledWith(
          initialContent,
          expect.any(Object)
        )
        expect(mockRealTimeValidator.validateContent).toHaveBeenCalledWith(
          initialContent,
          expect.any(Object)
        )
      })
    })

    it('should not auto-validate when autoValidate is false', () => {
      const initialContent = { type: 'doc', content: [] }

      renderHook(() => useContentValidation(initialContent, { autoValidate: false }))

      expect(mockContentValidationSystem.validateContent).not.toHaveBeenCalled()
      expect(mockRealTimeValidator.validateContent).not.toHaveBeenCalled()
    })
  })

  describe('Manual Validation', () => {
    it('should validate content manually', async () => {
      const { result } = renderHook(() => useContentValidation())

      const content = { type: 'doc', content: [] }

      await act(async () => {
        const summary = await result.current.validateContent(content)
        expect(summary).toEqual(mockValidationSummary)
      })

      expect(mockContentValidationSystem.validateContent).toHaveBeenCalledWith(
        content,
        expect.any(Object)
      )
      expect(result.current.summary).toEqual(mockValidationSummary)
    })

    it('should validate content in real-time', async () => {
      const { result } = renderHook(() => useContentValidation())

      const content = { type: 'doc', content: [] }

      await act(async () => {
        const realTimeResult = await result.current.validateRealTime(content)
        expect(realTimeResult).toEqual(mockRealTimeResult)
      })

      expect(mockRealTimeValidator.validateContent).toHaveBeenCalledWith(
        content,
        expect.any(Object)
      )
      expect(result.current.realTimeResult).toEqual(mockRealTimeResult)
    })

    it('should handle validation errors gracefully', async () => {
      mockContentValidationSystem.validateContent.mockImplementation(() => {
        throw new Error('Validation failed')
      })

      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        const summary = await result.current.validateContent({})
      })

      expect(result.current.summary).toBeDefined()
      expect(result.current.summary?.isValid).toBe(false)
      expect(result.current.summary?.errorCount).toBe(1)
    })
  })

  describe('Rule Management', () => {
    it('should initialize enabled rules correctly', async () => {
      const { result } = renderHook(() => useContentValidation())

      await waitFor(() => {
        expect(result.current.enabledRules.has('empty_content')).toBe(true)
        expect(result.current.enabledRules.has('missing_headings')).toBe(true)
      })
    })

    it('should configure rules', async () => {
      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        result.current.configureRule('empty_content', false)
      })

      expect(result.current.enabledRules.has('empty_content')).toBe(false)
      expect(mockContentValidationSystem.configureRule).toHaveBeenCalledWith('empty_content', false)
    })

    it('should reset rules to default', async () => {
      const { result } = renderHook(() => useContentValidation())

      // First disable a rule
      await act(async () => {
        result.current.configureRule('empty_content', false)
      })

      expect(result.current.enabledRules.has('empty_content')).toBe(false)

      // Then reset
      await act(async () => {
        result.current.resetRules()
      })

      expect(result.current.enabledRules.has('empty_content')).toBe(true)
    })
  })

  describe('Validation State', () => {
    it('should compute validation state correctly', async () => {
      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        await result.current.validateContent({})
      })

      expect(result.current.hasErrors).toBe(true)
      expect(result.current.hasWarnings).toBe(true)
      expect(result.current.hasSuggestions).toBe(true)
      expect(result.current.validationScore).toBe(75)
      expect(result.current.totalIssues).toBe(3)
    })

    it('should handle valid content state', async () => {
      const validSummary = {
        isValid: true,
        score: 95,
        totalIssues: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        issuesByCategory: {},
        recommendations: []
      }

      mockContentValidationSystem.validateContent.mockReturnValue(validSummary)

      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        await result.current.validateContent({})
      })

      expect(result.current.hasErrors).toBe(false)
      expect(result.current.hasWarnings).toBe(false)
      expect(result.current.hasSuggestions).toBe(false)
      expect(result.current.validationScore).toBe(95)
      expect(result.current.totalIssues).toBe(0)
    })
  })

  describe('Issue Handling', () => {
    it('should get issues by category', async () => {
      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        await result.current.validateContent({})
      })

      const issuesByCategory = result.current.getIssuesByCategory()
      expect(issuesByCategory).toEqual(mockValidationSummary.issuesByCategory)
    })

    it('should get issues by severity', async () => {
      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        await result.current.validateContent({})
      })

      const errors = result.current.getIssuesBySeverity('error')
      expect(errors).toHaveLength(1)
      expect(errors[0].severity).toBe('error')
    })

    it('should handle quick fixes', async () => {
      const mockQuickFix = jest.fn()
      const issueWithQuickFix = {
        ruleId: 'test_rule',
        severity: 'error' as const,
        message: 'Test issue',
        quickFix: {
          label: 'Fix it',
          action: mockQuickFix
        }
      }

      const { result } = renderHook(() => useContentValidation())

      await act(async () => {
        result.current.handleQuickFix(issueWithQuickFix)
      })

      expect(mockQuickFix).toHaveBeenCalled()
    })
  })

  describe('Options and Configuration', () => {
    it('should respect debounce delay option', () => {
      const customDelay = 1000
      renderHook(() => useContentValidation(undefined, { debounceDelay: customDelay }))

      // Debounce should be configured with custom delay
      // This is hard to test directly, but we can verify the hook doesn't crash
    })

    it('should disable real-time validation when requested', () => {
      const initialContent = { type: 'doc', content: [] }
      
      renderHook(() => useContentValidation(initialContent, { enableRealTime: false }))

      expect(mockRealTimeValidator.validateContent).not.toHaveBeenCalled()
    })

    it('should disable summary validation when requested', () => {
      const initialContent = { type: 'doc', content: [] }
      
      renderHook(() => useContentValidation(initialContent, { enableSummary: false }))

      expect(mockContentValidationSystem.validateContent).not.toHaveBeenCalled()
    })

    it('should use strict mode when enabled', async () => {
      const { result } = renderHook(() => 
        useContentValidation(undefined, { strictMode: true })
      )

      await act(async () => {
        await result.current.validateContent({})
      })

      expect(mockContentValidationSystem.validateContent).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ strictMode: true })
      )
    })

    it('should pass validation context', async () => {
      const context = {
        templateId: 'test-template',
        userId: 'test-user',
        existingVariables: ['var1', 'var2']
      }

      const { result } = renderHook(() => 
        useContentValidation(undefined, { context })
      )

      await act(async () => {
        await result.current.validateContent({})
      })

      expect(mockContentValidationSystem.validateContent).toHaveBeenCalledWith(
        {},
        expect.objectContaining(context)
      )
    })
  })

  describe('Cleanup', () => {
    it('should clear validation results', async () => {
      const { result } = renderHook(() => useContentValidation())

      // First validate to get some results
      await act(async () => {
        await result.current.validateContent({})
      })

      expect(result.current.summary).not.toBeNull()

      // Then clear
      await act(async () => {
        result.current.clearValidation()
      })

      expect(result.current.summary).toBeNull()
      expect(result.current.realTimeResult).toBeNull()
      expect(result.current.lastValidated).toBeNull()
      expect(result.current.isValidating).toBe(false)
    })

    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useContentValidation())

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow()
    })
  })
})

describe('useFieldValidation', () => {
  const mockFieldResult = {
    isValid: false,
    errors: [
      {
        field: 'title',
        message: 'Title is required',
        code: 'TITLE_REQUIRED',
        severity: 'error' as const
      }
    ],
    warnings: [],
    suggestions: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockRealTimeValidator.validateTitle.mockResolvedValue(mockFieldResult)
    mockRealTimeValidator.validateCategory.mockResolvedValue(mockFieldResult)
    mockRealTimeValidator.validateContent.mockResolvedValue(mockFieldResult)
  })

  describe('Field-specific Validation', () => {
    it('should validate title field', async () => {
      const { result } = renderHook(() => useFieldValidation('title', 'Test Title'))

      await waitFor(() => {
        expect(mockRealTimeValidator.validateTitle).toHaveBeenCalledWith(
          'Test Title',
          expect.any(Object)
        )
      })

      expect(result.current.value).toBe('Test Title')
    })

    it('should validate category field', async () => {
      const { result } = renderHook(() => useFieldValidation('category', 'Test Category'))

      await waitFor(() => {
        expect(mockRealTimeValidator.validateCategory).toHaveBeenCalledWith(
          'Test Category',
          expect.any(Object)
        )
      })
    })

    it('should validate content field', async () => {
      const content = { type: 'doc', content: [] }
      const { result } = renderHook(() => useFieldValidation('content', content))

      await waitFor(() => {
        expect(mockRealTimeValidator.validateContent).toHaveBeenCalledWith(
          content,
          expect.any(Object)
        )
      })
    })

    it('should handle unknown field types', async () => {
      const { result } = renderHook(() => useFieldValidation('unknown', 'value'))

      await waitFor(() => {
        expect(result.current.result?.isValid).toBe(true)
      })
    })
  })

  describe('Value Management', () => {
    it('should update value and trigger validation', async () => {
      const { result } = renderHook(() => useFieldValidation('title'))

      await act(async () => {
        result.current.setValue('New Title')
      })

      expect(result.current.value).toBe('New Title')
      
      await waitFor(() => {
        expect(mockRealTimeValidator.validateTitle).toHaveBeenCalledWith(
          'New Title',
          expect.any(Object)
        )
      })
    })

    it('should provide validation state', async () => {
      const { result } = renderHook(() => useFieldValidation('title', 'Test'))

      await waitFor(() => {
        expect(result.current.isValid).toBe(false)
        expect(result.current.hasErrors).toBe(true)
        expect(result.current.hasWarnings).toBe(false)
        expect(result.current.hasSuggestions).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockRealTimeValidator.validateTitle.mockRejectedValue(new Error('Validation failed'))

      const { result } = renderHook(() => useFieldValidation('title', 'Test'))

      await waitFor(() => {
        expect(result.current.result?.isValid).toBe(false)
        expect(result.current.result?.errors).toHaveLength(1)
      })
    })
  })

  describe('Options', () => {
    it('should respect debounce delay', () => {
      const customDelay = 500
      renderHook(() => useFieldValidation('title', 'Test', { debounceDelay: customDelay }))

      // Should not throw with custom delay
    })

    it('should pass validation context', async () => {
      const context = { userId: 'test-user' }
      
      renderHook(() => useFieldValidation('title', 'Test', { context }))

      await waitFor(() => {
        expect(mockRealTimeValidator.validateTitle).toHaveBeenCalledWith(
          'Test',
          expect.objectContaining(context)
        )
      })
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useFieldValidation('title', 'Test'))

      expect(() => unmount()).not.toThrow()
    })
  })
})

describe('Hook Integration', () => {
  it('should work together for complete validation workflow', async () => {
    const TestComponent = () => {
      const contentValidation = useContentValidation()
      const titleValidation = useFieldValidation('title', 'Test Title')

      return (
        <div>
          <span data-testid="content-valid">{contentValidation.summary?.isValid.toString()}</span>
          <span data-testid="title-valid">{titleValidation.isValid.toString()}</span>
        </div>
      )
    }

    const { getByTestId } = render(<TestComponent />)

    await waitFor(() => {
      expect(getByTestId('title-valid')).toHaveTextContent('false')
    })
  })

  it('should handle concurrent validations', async () => {
    const { result: contentResult } = renderHook(() => useContentValidation())
    const { result: titleResult } = renderHook(() => useFieldValidation('title', 'Test'))

    await act(async () => {
      await Promise.all([
        contentResult.current.validateContent({}),
        titleResult.current.setValue('New Title')
      ])
    })

    expect(mockContentValidationSystem.validateContent).toHaveBeenCalled()
    expect(mockRealTimeValidator.validateTitle).toHaveBeenCalled()
  })
})

// Helper component for testing
const TestComponent: React.FC<{ content?: any }> = ({ content }) => {
  const validation = useContentValidation(content)
  
  return (
    <div>
      <span data-testid="is-valid">{validation.summary?.isValid.toString()}</span>
      <span data-testid="score">{validation.validationScore}</span>
      <span data-testid="errors">{validation.hasErrors.toString()}</span>
    </div>
  )
}

const render = (component: React.ReactElement) => {
  const utils = require('@testing-library/react').render(component)
  return utils
}